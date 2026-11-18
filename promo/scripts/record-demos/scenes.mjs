// Records the website tour clips (see promo/tour). See README.md.
// Usage: node scenes.mjs <desk|phone> [outDir] [scene ...]   (outDir defaults to promo/public/demo)
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium, newPage, Rec, BASE, SUPA, wait, scrollTo, scrollToEl, hover, click, type, blocked, demoUser, demoSession } from "./lib.mjs";
const args = process.argv.slice(2);
const mode = args.shift();
if (mode !== "desk" && mode !== "phone") throw new Error("usage: node scenes.mjs <desk|phone> [outDir] [scene ...]");
const OUT = args[0] && (args[0].includes("/") || args[0].startsWith(".")) ? path.resolve(args.shift())
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../public/demo");
const only = args;
fs.mkdirSync(OUT, { recursive: true });
const PHONE = mode === "phone";

// ---- shared mocks -------------------------------------------------------
async function mockReviews(page, list) {
  await page.route("**/rest/v1/reviews*", (route) => {
    const sel = new URL(route.request().url()).searchParams.get("select") ?? "";
    if (sel === "rating") return route.fulfill({ json: list.map((r) => ({ rating: r.rating })) });
    return route.fulfill({ headers: { "content-range": list.length ? `0-${list.length - 1}/${list.length}` : "*/0", "access-control-expose-headers": "Content-Range" }, json: list });
  });
  await page.route("**/api/reviews", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const b = route.request().postDataJSON();
    const now = new Date().toISOString();
    const r = { id: "rev-demo", display_name: "Guest", rating: b.rating, body: b.body, hidden: false, created_at: now, updated_at: now };
    list.unshift(r);
    return route.fulfill({ json: { ok: true, review: r } });
  });
}
const ORDER = { ref: "BNC-7K2Q9F", status: "pending", body: null, name: "", variant: "", flavor: null };
async function mockOrders(page) {
  await page.route("**/api/orders", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    ORDER.body = route.request().postDataJSON();
    return route.fulfill({ status: 201, json: { ok: true, reference: ORDER.ref, trackingToken: ORDER.body.trackingToken, status: "pending", createdAt: new Date().toISOString() } });
  });
  await page.route("**/rest/v1/rpc/get_online_order*", (route) => {
    const b = ORDER.body ?? { lines: [{ quantity: 2 }], expectedSubtotal: 238, customer: { name: "Demo Customer", paymentPreference: "Cash", notes: "" }, fulfillment: "pickup" };
    const q = b.lines.reduce((a, l) => a + l.quantity, 0);
    const created = new Date(Date.now() - 60000).toISOString();
    const hist = ["pending", "accepted", "preparing", "ready", "completed"];
    const upto = hist.slice(0, hist.indexOf(ORDER.status) + 1);
    route.fulfill({ json: {
      reference: ORDER.ref, status: ORDER.status, fulfillment: b.fulfillment, customerName: b.customer.name, paymentPreference: b.customer.paymentPreference, notes: b.customer.notes,
      items: [{ itemId: "demo", itemName: ORDER.name || "Matcha (The Lucky Green Neko)", variantId: "v", variantName: ORDER.variant || "16oz", flavor: ORDER.flavor, unitPrice: b.expectedSubtotal / q, quantity: q, lineTotal: b.expectedSubtotal }],
      subtotal: b.expectedSubtotal, itemCount: q, rejectionReason: null, createdAt: created,
      statusHistory: upto.map((s, i) => ({ status: s, changedAt: new Date(Date.now() - (upto.length - i) * 20000).toISOString() })),
      realtimeTopic: "order:demo" } });
  });
}
const GAMES = [
  { id: "cat-cups", name: "Cat cups", description: "Oreo hides under one of three cups. Find him!", choices: 3, winPoints: 3, tryPoints: 1, maxPoints: 3 },
  { id: "lucky-paw", name: "Lucky paw", description: "Shake the treat jar and see what Latte paws out.", choices: 0, winPoints: null, tryPoints: null, maxPoints: 5 },
];
async function mockGames(page) {
  let played = 0, balance = 12;
  await page.route("**/rest/v1/loyalty_transactions*", (route) => route.fulfill({ json: [{ points: balance }] }));
  await page.route("**/rest/v1/rpc/mini_game_status*", (route) => route.fulfill({ json: { dailyPlays: 3, playsToday: played, playsLeft: 3 - played, games: GAMES } }));
  await page.route("**/rest/v1/rpc/play_mini_game*", (route) => {
    const b = route.request().postDataJSON();
    if (played >= 3) return route.fulfill({ json: { ok: false, error: "daily_limit_reached", playsLeft: 0 } });
    played++;
    const cups = b.p_game === "cat-cups"; const won = cups && b.p_choice === 1; const points = cups ? (won ? 3 : 1) : 2; balance += points;
    return route.fulfill({ json: { ok: true, playId: played, game: b.p_game, outcome: cups ? { hiddenUnder: 1, won } : { treat: points }, points, playsLeft: 3 - played, balance } });
  });
}
const TX = [
  { id: 1, customer_id: demoUser.id, points: 25, reason: "order-completed", order_id: "o1", note: null, created_at: "2026-11-10T08:30:00Z", online_orders: { reference: "BNC-4H8R2C" } },
  { id: 2, customer_id: demoUser.id, points: 35, reason: "order-completed", order_id: "o2", note: null, created_at: "2026-11-08T11:15:00Z", online_orders: { reference: "BNC-9M8P2A" } },
];
async function mockLoyalty(page) {
  let spent = 0;
  await page.route("**/rest/v1/loyalty_transactions*", (route) => {
    const sel = new URL(route.request().url()).searchParams.get("select");
    const rows = spent ? [...TX, { id: 3, customer_id: demoUser.id, points: -spent, reason: "reward-redeemed", order_id: null, note: null, created_at: new Date().toISOString(), online_orders: null }] : TX;
    return route.fulfill({ json: sel === "points" ? rows.map((t) => ({ points: t.points })) : rows });
  });
  await page.route("**/rest/v1/rpc/redeem_reward*", (route) => { spent = 50; route.fulfill({ json: { ok: true, code: "RWD-DEMO50", rewardName: "Spanish latte", pointsSpent: 50, newBalance: 10 } }); });
}
async function mockProfile(page) {
  await page.route("**/rest/v1/customer_profiles*", (route) => route.request().method() === "GET"
    ? route.fulfill({ json: { user_id: demoUser.id, full_name: "Demo Customer", phone: "09170000000", created_at: "2026-11-01T00:00:00Z", updated_at: "2026-11-01T00:00:00Z" } })
    : route.fallback());
  const latest = { id: "o1", reference: "BNC-4H8R2C", status: "completed", fulfillment: "pickup", customer_name: "Demo Customer", payment_preference: "Cash", notes: "", subtotal: 238, item_count: 2, rejection_reason: null, created_at: "2026-11-10T08:00:00Z",
    items: [{ line_number: 1, item_id: "m", item_name: "Matcha (The Lucky Green Neko)", variant_id: "v", variant_name: "16oz", flavor: "Vanilla Matcha Meow", unit_price: 119, quantity: 2, line_total: 238 }] };
  await page.route("**/rest/v1/online_orders*", (route) => route.fulfill({ headers: { "content-range": "0-0/1", "access-control-expose-headers": "Content-Range" }, json: [latest] }));
}
async function mockFavorites(page) {
  const saved = [];
  await page.route("**/rest/v1/favorites*", (route) => {
    const r = route.request(); const m = r.method();
    if (m === "GET") return route.fulfill({ json: saved });
    if (m === "POST") { saved.unshift({ item_id: r.postDataJSON().item_id, created_at: new Date().toISOString() }); return route.fulfill({ status: 201, body: "" }); }
    if (m === "DELETE") { saved.length = 0; return route.fulfill({ status: 204, body: "" }); }
    return route.fallback();
  });
}
async function mockGoogle(page) {
  await page.route("**/auth/v1/authorize*", (route) => {
    const back = new URL(new URL(route.request().url()).searchParams.get("redirect_to") ?? BASE + "/account/callback");
    back.searchParams.set("code", "demo-code");
    route.fulfill({ status: 302, headers: { location: back.toString() } });
  });
  await page.route("**/auth/v1/token*", (route) => route.fulfill({ json: demoSession() }));
  await page.route("**/auth/v1/user*", (route) => route.fulfill({ json: demoUser }));
  await page.route("**/auth/v1/logout*", (route) => route.fulfill({ status: 204, body: "" }));
}

// ---- helpers ------------------------------------------------------------
const nav = async (page, name) => {
  if (PHONE) {
    await click(page, page.getByRole("button", { name: "Open navigation" }));
    await wait(page, 700);
    await click(page, page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name, exact: true }));
  } else {
    await click(page, page.getByRole("navigation", { name: "Desktop navigation" }).getByRole("link", { name, exact: true }));
  }
  await page.waitForLoadState("networkidle"); await wait(page, 900);
};
async function tourHeadings(page, rec, stops, dwell = 1600) {
  for (const [re, title, sub, extra] of stops) {
    const h = page.locator("h1,h2,h3").filter({ hasText: re }).first();
    if (!(await h.count())) { console.log("  no heading", re); continue; }
    rec.mark(title, sub, extra);
    await scrollToEl(page, h, PHONE ? 0.18 : 0.22);
    await wait(page, dwell);
  }
}
async function addItem(page, rec, item, variant, flavor, extraQty = 0) {
  const btn = page.getByRole("button", { name: `Order ${item}` });
  await scrollToEl(page, btn, 0.45); await wait(page, 500);
  await click(page, btn);
  const dlg = page.getByRole("dialog");
  await dlg.waitFor(); await wait(page, 900);
  rec.mark("Build your order", "Pick a size, a flavour and how many");
  await click(page, dlg.getByRole("button", { name: new RegExp("^" + variant + "\\b") }).first());
  if (flavor) { await wait(page, 300); await click(page, dlg.getByRole("button", { name: new RegExp("^" + flavor) }).first()); }
  for (let i = 0; i < extraQty; i++) { await wait(page, 250); await click(page, dlg.getByRole("button", { name: "Increase quantity" }), { ms: 400 }); }
  await wait(page, 600);
  await click(page, dlg.getByRole("button", { name: "Add to Order" }));
  await wait(page, 900);
}

async function toggleTheme(page) {
  if (PHONE) {
    await click(page, page.getByRole("button", { name: "Open navigation" })); await wait(page, 700);
    await click(page, page.getByRole("switch", { name: "Night mode" })); await wait(page, 900);
    await click(page, page.getByRole("button", { name: "Close navigation" }));
  } else {
    await click(page, page.getByRole("button", { name: /Switch to (night|day|light) theme/ }).first());
  }
}
// ---- scenes ---------------------------------------------------------------
const SCENES = {
  async home(browser) {
    const page = await newPage(browser, { phone: PHONE });
    await mockReviews(page, []);
    await page.goto(BASE + "/", { waitUntil: "networkidle" }); await wait(page, 2500);
    const rec = new Rec(page, `home-${mode}`, OUT); await rec.start();
    rec.mark("The home page", "Real-time 3D: every drink and snack is a live model");
    await wait(page, 1800);
    const chips = page.getByRole("group", { name: "Jump to a featured item" }).or(page.locator('[aria-label="Jump to a featured item"]')).first();
    if (await chips.count()) {
      rec.mark("Featured items", "Tap a name to jump to it, with its price");
      for (const n of ["Takoyaki", "Buldak Carbo", "Cat-Feine"]) { await click(page, chips.getByRole("button", { name: n })); await wait(page, 1700); }
    }
    rec.mark("Scroll to explore", "Each product flies in as you scroll");
    const h2 = await page.locator("h2").filter({ hasText: /A local café/ }).first().evaluate((e) => e.getBoundingClientRect().top + scrollY);
    await scrollTo(page, h2 - 900, 1.4);
    await tourHeadings(page, rec, [
      [/A local café with a playful/, "About the café", "Coffee, comfort and the shop cats"],
      [/Visiting the Cats/, "Visiting the cats", "House rules so the cats stay happy"],
      [/What customers say/, "Customer reviews", "Ratings from real visits, right on the home page"],
      [/Brew ni Cat on your phone/, "The Android app", "Install the app straight from the site"],
      [/Coffee, cats, and community/, "Community", "Photos and posts from the café"],
      [/Find us in Kabacan/, "Find us", "Address, opening hours and directions"],
    ], 2000);
    rec.mark("Footer", "Every page, the shop's details and socials");
    await scrollTo(page, 99999, 1.2); await wait(page, 1400);
    const music = page.getByRole("button", { name: "Play café music" });
    if (await music.count()) { rec.mark("Café music & cat sounds", "Turn on the café's own playlist"); await hover(page, music); await wait(page, 1300); }
    rec.mark("Night mode", "One tap turns the whole site to night");
    await scrollTo(page, 0, 0.35, 1500);
    await toggleTheme(page);
    await wait(page, 2800);
    if (!PHONE) { await scrollTo(page, 1200, 1.2); await wait(page, 600); await scrollTo(page, 0, 1.2); }
    await toggleTheme(page);
    await wait(page, 1200);
    if (PHONE) {
      rec.mark("Phone menu", "Every page one tap away");
      await click(page, page.getByRole("button", { name: "Open navigation" })); await wait(page, 2200);
      await page.keyboard.press("Escape"); await wait(page, 900);
    }
    await rec.stop(); await page.context().close();
  },

  async order(browser) {
    const page = await newPage(browser, { phone: PHONE });
    await mockOrders(page); await mockGames(page);
    await page.goto(BASE + "/", { waitUntil: "networkidle" }); await wait(page, 1500);
    const rec = new Rec(page, `order-${mode}`, OUT); await rec.start();
    rec.mark("Order ahead online", "Open the menu from any page");
    await nav(page, "Menu");
    rec.mark("The full menu", "Live prices, straight from the shop's own system");
    await wait(page, 1200);
    await tourHeadings(page, rec, [
      [/^Buldak & Sedaap$/, "Buldak & Sedaap", "Spicy noodles, with milk or egg"],
      [/^Cat-Tastic Bites$/, "Cat-Tastic Bites", "Takoyaki, fries and nachos"],
      [/^Cat-Tastic Drinks$/, "Cat-Tastic Drinks", "Coffee, matcha, Oreo and sodas"],
    ], 1300);
    await addItem(page, rec, "Matcha (The Lucky Green Neko)", "16oz", "Vanilla Matcha Meow", 1);
    rec.mark("Your cart", "Running total, edit or remove anything");
    await wait(page, 1800);
    await click(page, page.getByRole("dialog", { name: "Your Order" }).getByRole("link", { name: "Proceed to Checkout" }));
    await page.waitForURL("**/checkout"); await wait(page, 1200);
    rec.mark("Checkout", "Pick up at the shop, no account needed", { demo: true });
    await type(page, page.getByLabel(/Full Name/), "Demo Customer");
    await type(page, page.getByLabel(/Contact Phone Number/), "09170000000");
    await wait(page, 500);
    await click(page, page.getByRole("button", { name: "Continue to Order Review" }));
    await wait(page, 1200);
    rec.mark("Review and place the order", "The shop's tablet gets it instantly", { demo: true });
    const place = page.getByRole("button", { name: "Place order" });
    await scrollToEl(page, place, 0.5); await wait(page, 900);
    await click(page, place);
    await page.waitForURL(/\/orders\//); await page.waitForLoadState("networkidle"); await wait(page, 1500);
    rec.mark("Live order tracking", "Follow every step until it's ready", { demo: true });
    const refresh = page.getByTestId("manual-refresh-button");
    for (const s of ["accepted", "preparing", "ready"]) {
      await wait(page, 1600); ORDER.status = s;
      if (await refresh.isVisible().catch(() => false)) await click(page, refresh, { ms: 500 });
      else await page.reload({ waitUntil: "networkidle" });
      await wait(page, 900);
    }
    ORDER.status = "preparing";
    if (await refresh.isVisible().catch(() => false)) await click(page, refresh, { ms: 400 });
    await wait(page, 1000);
    const card = page.getByTestId("play-while-you-wait");
    if (await card.count()) {
      rec.mark("Play while you wait", "Mini-games right on the order page");
      await scrollToEl(page, card, 0.3); await wait(page, 1000);
      const pop = page.getByRole("button", { name: "Play popup" });
      if (await pop.count()) { await click(page, pop); await wait(page, 2600); await click(page, page.getByRole("button", { name: "Close games popup" })); }
    }
    await wait(page, 800);
    await rec.stop(); await page.context().close();
  },

  async rider(browser) {
    const page = await newPage(browser, { phone: PHONE });
    await page.goto(BASE + "/menu", { waitUntil: "networkidle" }); await wait(page, 1500);
    const rec = new Rec(page, `rider-${mode}`, OUT); await rec.start();
    rec.mark("Delivery by a local rider", "Order Takoyaki for delivery");
    await addItem(page, rec, "Takoyaki (Pawsome Balls)", "8pcs", "Cheesy Calico");
    await click(page, page.getByRole("dialog", { name: "Your Order" }).getByRole("link", { name: "Proceed to Checkout" }));
    await page.waitForURL("**/checkout"); await wait(page, 1000);
    rec.mark("Rider delivery", "Choose delivery at checkout", { demo: true });
    await click(page, page.getByRole("radio", { name: /Rider Delivery/i }), { force: true });
    await type(page, page.getByLabel(/Full Name/), "Demo Customer");
    await type(page, page.getByLabel(/Contact Phone Number/), "09170000000");
    await type(page, page.getByLabel("Delivery Address"), "Demo Street, Poblacion, Kabacan");
    await click(page, page.getByRole("button", { name: "Continue to Order Review" }));
    await wait(page, 1200);
    const send = page.getByRole("button", { name: "Proceed to Send to Rider" });
    await scrollToEl(page, send, 0.5); await wait(page, 700);
    await click(page, send); await wait(page, 1500);
    rec.mark("Pick a rider", "Six local delivery services, one tap to message", { demo: true });
    const list = page.getByRole("list", { name: "Rider delivery services" });
    await scrollToEl(page, list, 0.25); await wait(page, 900);
    const links = await list.getByRole("link").all();
    for (const l of links.slice(0, 6)) await hover(page, l, 420);
    await wait(page, 1200);
    rec.mark("Order summary, ready to send", "Copied for the rider, with the shop's fees");
    await scrollTo(page, 0, 0.6); await wait(page, 1600);
    await rec.stop(); await page.context().close();
  },

  async signin(browser) {
    const page = await newPage(browser, { phone: PHONE });
    await mockGoogle(page); await mockProfile(page); await mockLoyalty(page); await mockFavorites(page);
    await page.goto(BASE + "/", { waitUntil: "networkidle" }); await wait(page, 1500);
    const rec = new Rec(page, `signin-${mode}`, OUT); await rec.start();
    rec.mark("Sign in", "One tap with Google, no password to remember", { demo: true });
    const sign = PHONE ? null : page.getByRole("link", { name: /^sign in$/i }).first();
    if (sign && await sign.isVisible()) await click(page, sign); else await page.goto(BASE + "/account/sign-in");
    await page.waitForURL("**/account/sign-in"); await wait(page, 1500);
    await click(page, page.getByRole("button", { name: "Sign in with Google" }));
    await page.waitForURL((u) => !u.pathname.includes("sign-in") && !u.pathname.includes("callback"), { timeout: 20000 });
    await page.waitForLoadState("networkidle"); await wait(page, 1500);
    rec.mark("You're signed in", "Your account is one tap away", { demo: true });
    if (PHONE) { await click(page, page.getByRole("button", { name: "Open navigation" })); await wait(page, 2200); await click(page, page.getByRole("button", { name: "Close navigation" })); }
    else { await click(page, page.getByRole("button", { name: "Account menu" })); await wait(page, 1800); }
    await page.goto(BASE + "/account", { waitUntil: "networkidle" }); await wait(page, 800);
    rec.mark("My account", "Latest order, profile and quick reorder", { demo: true });
    await wait(page, 1500); await scrollTo(page, 600); await wait(page, 1500);
    await page.goto(BASE + "/account/rewards", { waitUntil: "networkidle" }); await wait(page, 700);
    rec.mark("Loyalty points", "Earn 1 point for every ₱50 you spend", { demo: true });
    await wait(page, 1800);
    rec.mark("Rewards catalog", "Swap points for drinks, Takoyaki and combos", { demo: true });
    await scrollTo(page, 650, 1.6); await wait(page, 1000);
    await click(page, page.getByRole("button", { name: "Redeem Spanish latte for 50 points" }));
    await wait(page, 1300);
    rec.mark("Redeem a reward", "Show the code at the counter", { demo: true });
    await click(page, page.getByRole("dialog").getByRole("button", { name: "Confirm Redeem" }));
    await wait(page, 2600);
    await page.keyboard.press("Escape"); await wait(page, 600);
    await page.goto(BASE + "/menu", { waitUntil: "networkidle" }); await wait(page, 600);
    rec.mark("Favourites", "Save the drinks you love", { demo: true });
    const heart = page.getByRole("button", { name: "Save Matcha (The Lucky Green Neko) to favorites" });
    if (await heart.count()) { await click(page, heart); await wait(page, 1500); }
    await rec.stop(); await page.context().close();
  },

  async games(browser) {
    const page = await newPage(browser, { phone: PHONE, signedIn: true });
    await mockGames(page);
    await page.goto(BASE + "/games", { waitUntil: "networkidle" }); await wait(page, 2000);
    const rec = new Rec(page, `games-${mode}`, OUT); await rec.start();
    rec.mark("Cat games", "Three free plays a day for bonus points", { demo: true });
    await wait(page, 2000);
    rec.mark("Cat cups", "Oreo hides under a cup. Find him!", { demo: true });
    await click(page, page.getByRole("button", { name: "Cup 2" })); await wait(page, 3200);
    await click(page, page.getByRole("button", { name: "Hide him again" })); await wait(page, 1500);
    await click(page, page.getByRole("button", { name: "Cup 3" })); await wait(page, 3000);
    rec.mark("Lucky paw", "Shake the jar and see what Latte paws out", { demo: true });
    await click(page, page.getByRole("button", { name: "Shake the jar" })); await wait(page, 3600);
    rec.mark("Come back tomorrow", "Points go straight to your rewards", { demo: true });
    await scrollTo(page, 0, 1, 700); await wait(page, 1800);
    await rec.stop(); await page.context().close();
  },

  async review(browser) {
    const page = await newPage(browser, { phone: PHONE });
    await mockReviews(page, []);
    await page.goto(BASE + "/", { waitUntil: "networkidle" }); await wait(page, 1200);
    const rec = new Rec(page, `review-${mode}`, OUT); await rec.start();
    rec.mark("Reviews", "Tell the shop how your visit went");
    await nav(page, "Reviews");
    const sec = page.locator("#reviews");
    await scrollToEl(page, sec, 0.05); await wait(page, 1000);
    rec.mark("Leave a review", "Demo review — not from a real customer", { demo: true });
    const star = sec.getByRole("radio", { name: "5 stars" });
    for (const n of [1, 3, 5]) { await hover(page, sec.getByRole("radio", { name: `${n} star${n > 1 ? "s" : ""}` }), 380); await wait(page, 150); }
    await page.evaluate(() => window.__demo.ripple());
    await star.check({ force: true }); await wait(page, 700);
    await type(page, sec.getByLabel(/your review/i), "Lovely matcha, and Oreo sat with us the whole time!", 38);
    await wait(page, 600);
    await click(page, sec.getByRole("button", { name: "Post review" }));
    await wait(page, 1200);
    rec.mark("Posted", "It shows up right away, with the new average", { demo: true });
    await wait(page, 3000);
    await rec.stop(); await page.context().close();
  },

  async about(browser) {
    const page = await newPage(browser, { phone: PHONE });
    await page.goto(BASE + "/about", { waitUntil: "networkidle" }); await wait(page, 1500);
    const rec = new Rec(page, `about-${mode}`, OUT); await rec.start();
    rec.mark("About", "The story of Brew ni Cat");
    await wait(page, 1500);
    await tourHeadings(page, rec, [
      [/Rooted in Kabacan/, "Rooted in Kabacan", "A local café shaped by its community"],
      [/Visit Brew ni Cat in Poblacion/, "Plan your visit", "Where to find the shop and when it's open"],
    ], 2600);
    await rec.stop(); await page.context().close();
  },

  async gallery(browser) {
    const page = await newPage(browser, { phone: PHONE });
    await page.goto(BASE + "/gallery", { waitUntil: "networkidle" }); await wait(page, 2500);
    const rec = new Rec(page, `gallery-${mode}`, OUT); await rec.start();
    rec.mark("Gallery", "A 3D photo ring of life at the café");
    await wait(page, 1500);
    // keep the photo grid (customers' faces) below the frame: only the cat carousel is shown
    const next = page.getByRole("button", { name: "Next photo" });
    const { arrows, grid, vh } = await page.evaluate(() => ({
      arrows: document.querySelector('[aria-label="Next photo"]').getBoundingClientRect().bottom + scrollY,
      grid: [...document.querySelectorAll("h2")].find((h) => /Every frame/.test(h.textContent)).getBoundingClientRect().top + scrollY,
      vh: innerHeight }));
    const y = Math.max(0, arrows - vh * 0.9);
    if (grid - 40 < y + vh) throw new Error(`grid would show: arrows ${arrows} grid ${grid} vh ${vh}`);
    await scrollTo(page, y, 1.6, 1200); await wait(page, 600);
    for (let i = 0; i < 4; i++) {
      const b = await next.boundingBox(); const x = b.x + b.width / 2, yy = b.y + b.height / 2;
      await page.evaluate(([x, y]) => window.__demo.glide(x, y, 500), [x, yy]); await page.mouse.move(x, yy);
      await page.evaluate(() => window.__demo.ripple()); await next.click(); await wait(page, 1700);
    }
    const sy = await page.evaluate(() => scrollY); if (sy > y + 5) throw new Error("page scrolled toward the grid");
    await rec.stop(); await page.context().close();
  },

  async contact(browser) {
    const page = await newPage(browser, { phone: PHONE });
    await page.goto(BASE + "/", { waitUntil: "networkidle" }); await wait(page, 1200);
    const rec = new Rec(page, `contact-${mode}`, OUT); await rec.start();
    rec.mark("Contact & location", "Everything you need to visit or order");
    await nav(page, "Contact");
    await tourHeadings(page, rec, [[/Find us on Abellera St/, "Find us", "Address, hours and directions"]], 1200);
    const flip = page.locator("button").filter({ hasText: /Flip the sign|Show the (open|closed) side/ }).first();
    rec.mark("Open or closed?", "Flip the sign for today's hours");
    await click(page, flip); await wait(page, 2000); await click(page, flip); await wait(page, 1500);
    await tourHeadings(page, rec, [
      [/Contact Brew ni Cat directly/, "Call, text or email", "Facebook, TikTok and more"],
      [/Payment & takeout/, "Payment & takeout", "Cash or GCash, ₱10 takeout box"],
      [/Let a local rider order it for you/, "Delivery riders", "Six local riders deliver from the shop"],
    ], 1800);
    const list = page.getByRole("list", { name: "Rider delivery services" });
    if (await list.count()) { await scrollToEl(page, list, 0.3); for (const l of (await list.getByRole("link").all()).slice(0, 6)) await hover(page, l, 380); }
    await wait(page, 1200);
    await rec.stop(); await page.context().close();
  },
};

const browser = await chromium.launch({ headless: true, args: ["--ignore-gpu-blocklist", "--enable-gpu", "--use-angle=vulkan", "--enable-features=Vulkan", "--autoplay-policy=no-user-gesture-required"] });
for (const name of only.length ? only : Object.keys(SCENES)) {
  try { await SCENES[name](browser); } catch (e) { console.log("FAIL", name, e.message.split("\n").slice(0, 3).join(" / ")); for (const c of browser.contexts()) { for (const pg of c.pages()) await pg.screenshot({ path: `${OUT}/fail-${name}.png` }).catch(() => {}); await c.close(); } }
}
console.log("blocked:", JSON.stringify(blocked));
await browser.close();
