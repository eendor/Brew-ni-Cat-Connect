/**
 * Today's posts on the shop's Facebook Page (FR-114, added 2026-11-13).
 *
 * The staff post changes for the day on the Page, often as a picture only,
 * like "We open at 1:00 pm today". The assistant reads the Page's latest
 * posts, keeps the ones from today (Manila time), and reads the words in a
 * picture with Gemini when the post has no caption. Answers about the hours
 * then show the post, and an opening time or "closed today" in it replaces
 * the usual open status for today.
 *
 * The list is read again after two minutes at most, and a picture's words
 * are read once per post, so a busy chat doesn't call Meta or Gemini for
 * every message.
 */

import { formatTime } from "@/lib/site-content/format";

import { shopClock } from "./shop-time";

/** A post as the Graph API returns it. */
export type RawPost = Readonly<{
  id?: unknown;
  created_time?: unknown;
  message?: unknown;
  full_picture?: unknown;
}>;

export type PagePost = Readonly<{
  id: string;
  /** When it was posted, in ms since epoch. */
  time: number;
  /** The caption, or the words in the picture; cleaned, at most 300. */
  text: string;
}>;

export type PostSources = Readonly<{
  /** The Page's latest posts, newest first; null when they can't be read. */
  listPosts: () => Promise<readonly RawPost[] | null>;
  /** The words in a picture, "" when there are none, null when unknown. */
  readImageText?: (url: string) => Promise<string | null>;
  now: () => number;
}>;

/** How long a read of the Page's posts is used before reading again. */
export const POSTS_TTL_MS = 2 * 60 * 1000;
/** The most of today's posts shown or given to Gemini. */
export const MAX_TODAY_POSTS = 2;
export const MAX_POST_TEXT = 300;
/** A caption this short ("🐾", "See you!") is read with its picture. */
const SHORT_CAPTION = 20;

let listed: { at: number; posts: readonly PagePost[] } | null = null;
const pictureText = new Map<string, string>();

/** For tests: forget the posts and the words read from pictures. */
export function resetPagePosts(): void {
  listed = null;
  pictureText.clear();
}

/** One clean paragraph: no links, control characters or extra spaces. */
export function cleanPostText(value: unknown): string {
  if (typeof value !== "string") return "";
  const text = value
    .replace(/https?:\/\/\S+|www\.\S+/gi, "")
    .replace(/[\p{Cc}\p{Cf}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const characters = Array.from(text);
  return characters.length <= MAX_POST_TEXT
    ? text
    : `${characters.slice(0, MAX_POST_TEXT - 1).join("")}…`;
}

const SHOP_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const shopDay = (time: number) => SHOP_DAY.format(new Date(time));

/** Graph API times look like 2026-11-13T02:29:01+0000. */
export function postTime(value: unknown): number {
  if (typeof value !== "string") return NaN;
  return Date.parse(value.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
}

/** Only a picture on Facebook's own servers is fetched. */
export function isPagePicture(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname.endsWith(".fbcdn.net") ||
        url.hostname.endsWith(".facebook.com"))
    );
  } catch {
    return false;
  }
}

async function postText(
  post: RawPost,
  id: string,
  sources: PostSources,
): Promise<string> {
  const caption = cleanPostText(post.message);
  if (caption.length > SHORT_CAPTION || !sources.readImageText) return caption;
  if (!isPagePicture(post.full_picture)) return caption;
  let words = pictureText.get(id);
  if (words === undefined) {
    const read = await sources
      .readImageText(post.full_picture)
      .catch(() => null);
    if (read === null) return caption; // try again on the next read
    words = cleanPostText(read);
    if (pictureText.size >= 50) pictureText.clear();
    pictureText.set(id, words);
  }
  return cleanPostText([words, caption].filter(Boolean).join(" "));
}

/** Today's posts that say something, newest first; [] when unknown. */
export async function readTodaysPosts(
  sources: PostSources,
): Promise<readonly PagePost[]> {
  const now = sources.now();
  if (listed && now - listed.at < POSTS_TTL_MS) {
    return listed.posts.filter((post) => shopDay(post.time) === shopDay(now));
  }
  const raw = await sources.listPosts().catch(() => null);
  if (raw === null) return [];
  const today = shopDay(now);
  const posts: PagePost[] = [];
  for (const post of raw) {
    if (posts.length >= MAX_TODAY_POSTS) break;
    const id = typeof post.id === "string" ? post.id : null;
    const time = postTime(post.created_time);
    if (!id || !Number.isFinite(time) || time > now + 5 * 60 * 1000) continue;
    if (shopDay(time) !== today) continue;
    const text = await postText(post, id, sources);
    if (text) posts.push({ id, time, text });
  }
  listed = { at: now, posts };
  return posts;
}

export type PostedHours =
  Readonly<{ kind: "closed" }> | Readonly<{ kind: "opens"; minutes: number }>;

const CLOSED_TODAY =
  /\b(?:closed|sarado|close)\s+(?:(?:po|muna|kami|we're|we are)\s+){0,3}(?:today|ngayon|for today|this day)\b/i;
const ANOTHER_DAY =
  /\b(?:tomorrow|bukas|next week|on (?:mon|tues|wednes|thurs|fri|satur|sun)day)\b/i;
const OPENS_AT =
  /\bopen(?:s|ing)?\s+(?:(?:po|kami|today|ngayon)\s+){0,3}(?:at|by|around|from|ng)\s+(\d{1,2})(?::(\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)/i;

/** An opening time or "closed today" in today's newest post that has one. */
export function postedHours(posts: readonly PagePost[]): PostedHours | null {
  for (const post of posts) {
    // "We open tomorrow at 3 pm" is about another day.
    if (ANOTHER_DAY.test(post.text)) continue;
    if (CLOSED_TODAY.test(post.text)) return { kind: "closed" };
    const match = OPENS_AT.exec(post.text);
    if (match) {
      const hour = Number(match[1]);
      const minute = Number(match[2] ?? 0);
      if (hour < 1 || hour > 12 || minute > 59) continue;
      const pm = /^p/i.test(match[3] ?? "");
      return {
        kind: "opens",
        minutes: ((hour % 12) + (pm ? 12 : 0)) * 60 + minute,
      };
    }
  }
  return null;
}

const asTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/**
 * Today's open status from a post, when one changes it: closed, or opening
 * later than now. null when no post changes the usual status.
 */
export function postedStatusText(
  posts: readonly PagePost[],
  now: number,
): string | null {
  const hours = postedHours(posts);
  if (!hours) return null;
  if (hours.kind === "closed") {
    return "🚪 Sorry, we're closed today, as we posted on our Page.";
  }
  if (shopClock(now).minutes < hours.minutes) {
    return `⏰ Today we open at ${formatTime(asTime(hours.minutes))}, as we posted on our Page.`;
  }
  return null;
}

/** The posts, quoted, for a reply about the hours. */
export function postsNotice(posts: readonly PagePost[]): string | null {
  if (posts.length === 0) return null;
  return posts.map((post) => `📢 Posted today: “${post.text}”`).join("\n");
}

/** The posts, for the facts Gemini may use. */
export function postsFact(posts: readonly PagePost[]): string | null {
  if (posts.length === 0) return null;
  return `Posted today on the shop's Facebook Page (these replace the usual hours for today):\n${posts
    .map((post) => `- ${post.text}`)
    .join("\n")}`;
}
