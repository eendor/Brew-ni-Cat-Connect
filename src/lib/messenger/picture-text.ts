/**
 * Reads the words in a picture the shop posted on its Page (FR-114), with
 * Gemini. The staff often post a day's change as a picture only, like
 * "We open at 1:00 pm today". Only pictures on Facebook's own servers are
 * fetched (the caller checks), at most 4 MB, and the answer is the words
 * alone, cleaned and cut to 300 characters by the caller.
 */

import { isPagePicture } from "./page-posts";

export const PICTURE_MAX_BYTES = 4 * 1024 * 1024;
const PICTURE_TIMEOUT_MS = 10_000;
const READ_TIMEOUT_MS = 20_000;
/** Models that read pictures on a free-tier key, fastest first. */
export const PICTURE_MODELS: readonly string[] = [
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
  "gemini-3.5-flash",
];
const NONE = "NONE";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models";

export const PICTURE_PROMPT = `This is a picture a café posted on its Facebook Page. Write out the words in it that tell customers something (opening time, closing, a promo, an event), as one plain line. Write only the words you can read, nothing else. If there are no such words, answer ${NONE}.`;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * The words in the picture, "" when it has none, null when it can't be read
 * now (so it is tried again later).
 */
export function createPictureReader(
  apiKey: string,
  options: Readonly<{
    fetch?: typeof fetch;
    models?: readonly string[];
  }> = {},
): (url: string) => Promise<string | null> {
  const request = options.fetch ?? fetch;
  const models = options.models?.length ? options.models : PICTURE_MODELS;
  return async (url) => {
    if (!isPagePicture(url)) return "";
    let data: string;
    let mimeType: string;
    try {
      const picture = await request(url, {
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(PICTURE_TIMEOUT_MS),
      });
      if (!picture.ok) return null;
      mimeType = (picture.headers.get("content-type") ?? "")
        .split(";")[0]!
        .trim()
        .toLowerCase();
      if (!IMAGE_TYPES.has(mimeType)) return "";
      const bytes = await picture.arrayBuffer();
      if (bytes.byteLength === 0 || bytes.byteLength > PICTURE_MAX_BYTES) {
        return "";
      }
      data = Buffer.from(bytes).toString("base64");
    } catch {
      return null;
    }
    const deadline = AbortSignal.timeout(READ_TIMEOUT_MS);
    for (const model of models) {
      if (deadline.aborted) break;
      try {
        const response = await request(
          `${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    { inline_data: { mime_type: mimeType, data } },
                    { text: PICTURE_PROMPT },
                  ],
                },
              ],
              generationConfig: { temperature: 0, maxOutputTokens: 200 },
            }),
            signal: deadline,
            cache: "no-store",
          },
        );
        if (!response.ok) continue;
        const json = (await response.json()) as {
          candidates?: { content?: { parts?: { text?: unknown }[] } }[];
        };
        const text = (json.candidates?.[0]?.content?.parts ?? [])
          .map((part) => (typeof part.text === "string" ? part.text : ""))
          .join(" ")
          .trim();
        if (!text) continue;
        return text
          .replace(/[".]+$/, "")
          .trim()
          .toUpperCase() === NONE
          ? ""
          : text;
      } catch {
        // too slow, or the network failed: try the next model
      }
    }
    return null;
  };
}
