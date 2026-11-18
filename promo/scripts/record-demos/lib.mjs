// Demo recorder: CDP screencast + injected cursor + smooth scroll.
// Every write to Supabase or the site's /api is either mocked here or blocked.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
// the site's repo: Playwright comes from its node_modules, Supabase's public URL from its .env.local
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const req = createRequire(REPO + "/package.json");
export const { chromium } = req("@playwright/test");

function readEnv() {
  const env = {};
  for (const line of fs.readFileSync(REPO + "/.env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}
const ENV = readEnv();
export const SUPA = ENV.NEXT_PUBLIC_SUPABASE_URL;
const ANON = ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY || ENV.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const BASE = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:3200";
const READ_RPCS = new Set(["shop_counter_active_today", "loyalty_settings", "loyalty_rewards", "list_online_orders_by_token"]);
export const blocked = [];

export const demoUser = {
  id: "demo-customer", aud: "authenticated", role: "authenticated",
  email: "demo@example.com", email_confirmed_at: "2026-11-01T00:00:00Z",
  app_metadata: { provider: "google" }, user_metadata: { full_name: "Demo Customer" },
  created_at: "2026-11-01T00:00:00Z", updated_at: "2026-11-01T00:00:00Z",
};
export const demoSession = () => ({
  access_token: "demo-access-token", token_type: "bearer", expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "demo-refresh-token", user: demoUser,
});
export const storageKey = `sb-${new URL(SUPA).hostname.split(".")[0]}-auth-token`;

// The cursor is drawn by the page itself. Two rules keep it from jumping:
// - it keeps its position across page loads (sessionStorage), so a new page
//   starts it where the click left it;
// - glides and scrolls advance per painted frame, at most ~1/30 s each, so a
//   busy page slows the motion down instead of skipping ahead.
// The cursor is hidden unless DEMO_CURSOR=1: the videos show plain navigation.
// DEMO_PROBE=1 shows it with a magenta dot at the tip, for measuring smoothness.
const CURSOR_JS = (touch, probe, show) => `(() => {
  const TOUCH = ${touch}, PROBE = ${probe}, SHOW = ${show};
  let el, x = innerWidth * 0.62, y = innerHeight * 0.55;
  try { const p = JSON.parse(sessionStorage.getItem('__demo_cursor') || 'null'); if (p) { x = p[0]; y = p[1]; } } catch {}
  function mount() {
    if (!SHOW || el || !document.body) return;
    el = document.createElement('div');
    el.id = '__demo_cursor';
    el.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;will-change:transform;';
    el.innerHTML = (TOUCH
      ? '<div style="width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(255,255,255,.35);border:2px solid rgba(255,255,255,.9);box-shadow:0 2px 10px rgba(0,0,0,.35)"></div>'
      : '<svg width="30" height="30" viewBox="0 0 24 24" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))"><path d="M4 2.5 L4 19.5 L8.6 15.4 L11.7 22 L14.6 20.7 L11.6 14.2 L17.8 14.2 Z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>')
      + (PROBE ? '<div style="position:absolute;left:-4px;top:-4px;width:8px;height:8px;background:#f0f"></div>' : '');
    document.body.appendChild(el);
    place();
  }
  function place() { if (PROBE) (window.__demo_log ||= []).push([Date.now(), Math.round(x), Math.round(y), location.pathname, self === top]); if (el) el.style.transform = 'translate(' + x + 'px,' + y + 'px)'; try { sessionStorage.setItem('__demo_cursor', JSON.stringify([x, y])); } catch {} }
  const ease = (t) => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
  // runs f(eased progress) once per painted frame; a slow frame counts as at most 34 ms
  const sine = (t) => (1 - Math.cos(Math.PI * t)) / 2;
  function animate(ms, f, curve = ease) { return new Promise((res) => { let t = 0, last = performance.now();
    const step = (now) => { t = Math.min(1, t + Math.min(now - last, 34) / ms); last = now; f(curve(t)); t < 1 ? requestAnimationFrame(step) : res(); };
    requestAnimationFrame(step); }); }
  window.__demo = {
    glide(tx, ty, ms) { mount(); const sx = x, sy = y;
      // no cursor on screen: just a short beat before the click, so the viewer sees it happen
      if (!SHOW) { x = tx; y = ty; place(); return new Promise((res) => setTimeout(res, 350)); }
      // a slight arc looks like a hand, not a robot
      const dist = Math.hypot(tx - sx, ty - sy), bend = dist * 0.08;
      // calm speed: long moves take longer (peak about 1100 px/s), so no frame jumps far
      ms = Math.max(ms, 250 + dist * 1.4);
      return animate(ms, (e) => { x = sx + (tx - sx) * e + Math.sin(Math.PI * e) * bend; y = sy + (ty - sy) * e - Math.sin(Math.PI * e) * bend * .5; place(); }, sine); },
    ripple() { if (!SHOW) return; mount(); const r = document.createElement('div');
      r.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;left:'+(x-22)+'px;top:'+(y-22)+'px;width:44px;height:44px;border-radius:50%;border:3px solid rgba(232,200,154,.95);background:rgba(232,200,154,.25);transform:scale(.3);opacity:1;transition:transform .45s cubic-bezier(.2,.8,.2,1),opacity .5s ease';
      document.body.appendChild(r); requestAnimationFrame(() => { r.style.transform = 'scale(1.6)'; r.style.opacity = '0'; });
      if (el) { el.style.transition = 'scale .12s'; el.style.scale = '.82'; setTimeout(() => el.style.scale = '1', 140); }
      setTimeout(() => r.remove(), 600); },
    scroll(to, ms) { const s = scrollY;
      return animate(ms, (e) => window.scrollTo({ top: s + (to - s) * e, behavior: 'instant' })); },
    pos() { return [x, y]; },
    show(v) { mount(); if (el) el.style.opacity = v ? '1' : '0'; },
  };
  document.addEventListener('DOMContentLoaded', mount);
  // hide scrollbars so the frames look clean
  const st = document.createElement('style'); st.textContent = 'html{scrollbar-width:none} ::-webkit-scrollbar{display:none}';
  document.documentElement.appendChild(st);
})();`;

export async function newPage(browser, { phone = false, signedIn = false } = {}) {
  const ctx = await browser.newContext(phone
    ? { viewport: { width: 405, height: 720 }, deviceScaleFactor: 8 / 3, isMobile: true, hasTouch: true, serviceWorkers: "block",
        userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36" }
    : { viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.2, serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.phone = phone;
  // a Tuesday, 2 PM in Kabacan: the shop is open, so ordering works
  // (time keeps ticking; only the starting point is shifted)
  await page.addInitScript((target) => {
    const RealDate = Date, shift = target - RealDate.now();
    class ShiftedDate extends RealDate {
      constructor(...a) { if (a.length) super(...a); else super(RealDate.now() + shift); }
      static now() { return RealDate.now() + shift; }
    }
    globalThis.Date = ShiftedDate;
  }, Date.parse("2026-11-17T06:00:00Z"));
  await page.addInitScript(CURSOR_JS(phone, process.env.DEMO_PROBE === "1", process.env.DEMO_CURSOR === "1" || process.env.DEMO_PROBE === "1"));
  // the intro popups and tours would cover the demo: mark them seen
  await page.addInitScript(() => { try { localStorage.setItem('bnc-demo', '1'); } catch {} });
  if (signedIn) await page.addInitScript(({ k, v }) => localStorage.setItem(k, JSON.stringify(v)), { k: storageKey, v: demoSession() });

  // Guard first (lowest priority): reads pass, writes are blocked and logged.
  await page.route(SUPA + "/**", async (route) => {
    const r = route.request(); const u = new URL(r.url()); const m = r.method();
    const rpc = u.pathname.match(/\/rpc\/([a-z_]+)/)?.[1];
    const headers = { ...r.headers(), authorization: `Bearer ${ANON}`, apikey: ANON };
    if (u.pathname.startsWith("/auth/")) { blocked.push(m + " " + u.pathname); return route.fulfill({ status: 401, json: { message: "demo" } }); }
    if (u.pathname.startsWith("/realtime/")) return route.abort();
    if (m === "GET" || m === "HEAD" || m === "OPTIONS") return route.continue({ headers });
    if (m === "POST" && rpc && READ_RPCS.has(rpc)) return route.continue({ headers });
    blocked.push(m + " " + u.pathname); return route.abort();
  });
  await page.route("**/api/**", (route) => {
    const r = route.request();
    if (r.method() === "GET") return route.continue();
    blocked.push(r.method() + " " + new URL(r.url()).pathname); return route.abort();
  });
  // Tables that belong to a signed-in customer: never read the live rows.
  for (const t of ["favorites", "customer_profiles", "online_orders", "loyalty_transactions", "reward_codes", "data_requests"])
    await page.route(`**/rest/v1/${t}*`, (route) => route.request().method() === "GET" ? route.fulfill({ json: [] }) : route.fallback());
  if (signedIn) {
    await page.route("**/auth/v1/user*", (route) => route.fulfill({ json: demoUser }));
    await page.route("**/auth/v1/token*", (route) => route.fulfill({ json: demoSession() }));
  }
  return page;
}

export class Rec {
  constructor(page, name, outDir) { this.page = page; this.name = name; this.dir = path.join(outDir, name); this.frames = []; this.marks = []; }
  async start() {
    fs.rmSync(this.dir, { recursive: true, force: true }); fs.mkdirSync(this.dir + "/f", { recursive: true });
    const phone = this.page.phone;
    this.cdp = await this.page.context().newCDPSession(this.page);
    let n = 0;
    this.cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
      const file = `f/${String(n++).padStart(5, "0")}.jpg`;
      fs.writeFileSync(path.join(this.dir, file), Buffer.from(data, "base64"));
      this.frames.push({ file, t: metadata.timestamp });
      try { await this.cdp.send("Page.screencastFrameAck", { sessionId }); } catch {}
    });
    await this.cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: phone ? 1080 : 1920, maxHeight: phone ? 1920 : 1080, everyNthFrame: 1 });
    this.t0 = Date.now() / 1000;
  }
  // a caption: what the viewer is looking at, from now until the next one
  mark(title, sub = "", extra = {}) { this.marks.push({ t: Date.now() / 1000, title, sub, ...extra }); }
  async stop() {
    if (process.env.DEMO_PROBE === "1") fs.writeFileSync(path.join(this.dir, "..", `${this.name}.cursor.json`), JSON.stringify(await this.page.evaluate(() => window.__demo_log || []).catch(() => [])));
    await this.cdp.send("Page.stopScreencast");
    await new Promise((r) => setTimeout(r, 300));
    const end = Date.now() / 1000;
    // Chrome now and then delivers an older frame late: keep arrival order and drop
    // any frame that is not newer than the one before it, so nothing steps backwards
    const fr = []; for (const f of this.frames) if (f.t > 0 && (!fr.length || f.t > fr[fr.length - 1].t)) fr.push(f);
    // page loads can stall the screen for seconds: hold any frame at most MAX_HOLD,
    // and move the captions by the same amount so they stay on their moments
    const MAX_HOLD = 1.4;
    const lines = [], cut = []; // cut: [time, seconds removed before it]
    let removed = 0, maxGap = 0;
    for (let i = 0; i < fr.length; i++) {
      const next = i + 1 < fr.length ? fr[i + 1].t : end;
      const gap = next - fr[i].t; maxGap = Math.max(maxGap, gap);
      const d = Math.min(gap, MAX_HOLD);
      removed += gap - d; cut.push([next, removed]);
      lines.push(`file '${fr[i].file}'`, `duration ${Math.max(0.001, d).toFixed(4)}`);
    }
    lines.push(`file '${fr[fr.length - 1].file}'`);
    fs.writeFileSync(path.join(this.dir, "list.txt"), lines.join("\n"));
    const start = fr[0].t;
    const at = (t) => { let r = 0; for (const [ct, cr] of cut) { if (ct <= t) r = cr; else break; } return Math.max(0, t - start - r); };
    const marks = this.marks.map((m) => ({ ...m, t: +at(m.t).toFixed(3) }));
    const seconds = end - start - removed;
    const stats = { frames: fr.length, seconds: +seconds.toFixed(2), fps: +(fr.length / seconds).toFixed(1), maxGapMs: Math.round(maxGap * 1000), trimmed: +removed.toFixed(2) };
    fs.writeFileSync(path.join(this.dir, "marks.json"), JSON.stringify({ name: this.name, ...stats, marks }, null, 1));
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", "list.txt",
      "-vf", `fps=30,scale=${this.page.phone ? "1080:1920" : "1920:1080"}:flags=lanczos,format=yuv420p`,
      "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-movflags", "+faststart", `../${this.name}.mp4`], { cwd: this.dir });
    // the clip's captions sit next to it, as <name>.json
    fs.copyFileSync(path.join(this.dir, "marks.json"), path.join(this.dir, "..", `${this.name}.json`));
    if (process.env.DEMO_KEEP !== "1") fs.rmSync(this.dir, { recursive: true, force: true });
    else fs.writeFileSync(path.join(this.dir, "frames.json"), JSON.stringify(this.frames));
    console.log(this.name, JSON.stringify(stats));
    return stats;
  }
}

// --- actions -------------------------------------------------------------
export const wait = (page, ms) => page.waitForTimeout(ms);
export async function scrollTo(page, y, msPerPx = 1.6, min = 700) {
  const cur = await page.evaluate(() => scrollY);
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const to = Math.max(0, Math.min(max, y));
  const ms = Math.max(min, Math.abs(to - cur) * msPerPx);
  await page.evaluate(([to, ms]) => window.__demo.scroll(to, ms), [to, ms]);
}
export async function scrollToEl(page, loc, where = 0.35) {
  await loc.waitFor({ state: "attached" });
  const y = await loc.evaluate((el, where) => { const r = el.getBoundingClientRect(); return scrollY + r.top - innerHeight * where; }, where);
  await scrollTo(page, y);
}
export async function hover(page, loc, ms = 650) {
  await loc.waitFor({ state: "visible" });
  let box = await loc.boundingBox();
  const vh = page.viewportSize().height;
  if (!box || box.y < 60 || box.y + box.height > vh - 40) {
    const inDialog = await loc.evaluate((el) => { for (let e = el; e; e = e.parentElement) { if (e.getAttribute && e.getAttribute('role') === 'dialog') return true; if (getComputedStyle(e).position === 'fixed') return true; } return false; });
    if (inDialog) { await loc.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "smooth" })); await wait(page, 750); }
    else { await scrollToEl(page, loc, 0.4); await wait(page, 150); }
    box = await loc.boundingBox();
  }
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.evaluate(([x, y, ms]) => window.__demo.glide(x, y, ms), [x, y, ms]);
  await page.mouse.move(x, y);
  return { x, y };
}
export async function click(page, loc, { ms = 650, pause = 120, force = false } = {}) {
  await hover(page, loc, ms);
  await wait(page, pause);
  await page.evaluate(() => window.__demo.ripple());
  await loc.click({ force });
  await wait(page, 250);
}
export async function type(page, loc, text, delay = 42) {
  await click(page, loc);
  await loc.pressSequentially(text, { delay });
}
