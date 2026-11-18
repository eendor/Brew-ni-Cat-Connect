# Feature demo recorder

Records the screen clips for the website tour video (`promo/tour/`). A
headless Chromium clicks through the real website with smooth scrolling and no
visible cursor. Each step adds a caption, for example "Live order tracking"
with the line "Follow every step until it's ready". The tour shows these
captions under the clip.

| Scene     | What it shows                                                                    |
| --------- | -------------------------------------------------------------------------------- |
| `home`    | 3D hero, featured items, every home section, footer, café music, night mode     |
| `order`   | Menu categories, item options, cart, checkout, place order, live tracking, games |
| `rider`   | Rider delivery checkout, the six local riders, the order summary for the rider   |
| `signin`  | Sign in with Google, account, points, rewards catalog, redeeming, favourites     |
| `games`   | Cat cups (win and miss), Lucky paw, the daily limit                              |
| `review`  | Picking stars, writing and posting a review                                      |
| `about`   | The About page                                                                   |
| `gallery` | The 3D photo ring (cats only, see below)                                         |
| `contact` | Address, the open/closed sign, contact details, payment, delivery riders         |

## Nothing reaches the live shop

The site reads the shop's public data: the menu, prices, hours and rewards.
Everything else is either mocked in the browser or blocked:

- **Writes are mocked.** These all get made-up answers from the recorder:
  - placing an order
  - the order's status
  - signing in with Google
  - the account, points and rewards
  - the mini-games
  - posting a review
- **Every other write is blocked.** Any other write to Supabase or to the
  site's `/api`, and realtime, is aborted. At the end of a run the recorder
  prints the blocked list, so you can check it.
- **Customer data is replaced.** Tables that hold customer data (orders,
  favourites, profiles, points) answer with empty or demo rows only.
- **Demo identities only.** The customer is "Demo Customer" with
  `demo@example.com` and `09170000000`. Order references are made up.
- **The review is fake.** The posted review is written by the recorder, and
  its caption says so: "Demo review — not from a real customer".
- **Demo data is tagged.** Captions over demo data carry a `demo` flag.
- **No customer faces.** The gallery's photo grid includes photos of
  customers, so the gallery scene stays on the cat photo ring and checks that
  the grid never scrolls into view.
- **The shop is shown as open.** The page's clock is moved to a Tuesday
  afternoon, Kabacan time, so that ordering works whenever you record.

## Run it

You need the site's `.env.local`, because the recorder reads the public
Supabase URL and anon key from it. You also need ffmpeg and a GPU-capable
Chromium; Playwright's own Chromium works.

```bash
# from the repo root: build the site the way production runs it
NEXT_PUBLIC_ONLINE_ORDERING=enabled npm run build
npm run start -- -p 3200 --hostname 127.0.0.1    # leave it running

# from promo/
node scripts/record-demos/scenes.mjs desk        # 1920×1080 clips
node scripts/record-demos/scenes.mjs phone       # 1080×1920 clips
node scripts/record-demos/scenes.mjs desk order  # just one scene
```

- **Different server.** Set `DEMO_BASE_URL` to record from a server other
  than `http://127.0.0.1:3200`.
- **What you get.** Each scene writes `public/demo/<scene>-<desk|phone>.mp4`
  (30 fps, H.264) and `<scene>-<desk|phone>.json`, which holds the captions
  with their times.
- **When a scene fails.** It saves `fail-<scene>.png` in the same folder and
  the other scenes keep going.
- **Not committed.** `public/demo/` is in `.gitignore`, because the clips are
  a few hundred MB.

## Then build the tour

See "Website tour" in `promo/README.md`.

## How it stays smooth

- **Frames.** Frames come from Chrome's screencast, which runs at 30–55 fps
  headless on the GPU. ffmpeg then places each frame for exactly as long as
  it was on screen.
- **Page loads.** A page load can freeze the screen for a few seconds. Any
  frame is therefore held for at most 1.4 s, and the captions move back by the
  same amount.
- **Scrolling.** Scrolling is animated in the page, so it never jumps.
- **No cursor.** Headless Chrome sometimes sends a stale frame, which made a
  drawn cursor look like it jumped back. The cursor is therefore hidden, and
  frames that arrive out of order are dropped.
- **Debugging.** `DEMO_CURSOR=1` shows the cursor again. `DEMO_PROBE=1` adds a
  tracking dot and writes `<scene>.cursor.json`. `DEMO_KEEP=1` keeps the raw
  frames.
