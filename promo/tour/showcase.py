"""Build the short showcase video (HyperFrames, under a minute):
showcase-landscape/index.html (1920x1080) and showcase-vertical/index.html
(1080x1920), plus their music.

    python3 showcase.py

The highlights of the website tour, cut to the beat: nine quick moments from
the site's screen recordings, then three beats of the Android app. It looks
nothing like the first promo (green and cream, condensed capitals, still
pictures): every scene has its own bright colour, the clips sit in tilted
sticker cards, captions are outlined stickers with a hard shadow, the type is
rounded (Fredoka), and scenes change with a circle wipe.

Uses the recordings in ../public/demo and the assets folder from build.py
(run `python3 build.py` first). Render with `npm run render:showcase` and
`npm run render:showcase-vertical`.
"""

from __future__ import annotations

import html
import itertools
import json
import os
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(HERE, "..", "public")
ASSETS = os.path.join(HERE, "assets")
SITE = "brew-ni-cat-connect.vercel.app"

BPM = 126
BAR = 4 * 60 / BPM
SCENE = 2 * BAR  # every scene is two bars, so the cuts land on the beat
WIPE = 0.5
OUTRO = 4.6

# (recording, caption mark to start from, seconds after it, playback speed, title, line, demo data?)
WEB = [
    ("home", "Featured items", 0.4, 1.0, "A café you can explore", "3D drinks right on the home page", False),
    ("order", "Build your order", 0.3, 1.5, "Order ahead", "Pick a size, a flavour and how many", False),
    ("order", "Live order tracking", 0.2, 1.3, "Track it live", "Watch your order get made", True),
    ("rider", "Pick a rider", 0.0, 1.2, "Or get it delivered", "Local riders, one tap to message", False),
    ("signin", "Loyalty points", 0.0, 1.3, "Earn points", "Then trade them for rewards", True),
    ("games", "Cat cups", 0.6, 1.6, "Play cat games", "Win a few extra points", True),
    ("review", "Leave a review", 0.5, 2.0, "Leave a review", "Demo review, not a real customer", True),
    ("gallery", "Gallery", 2.0, 1.2, "Meet the café cats", "A 3D ring of cat photos", False),
    ("contact", "Open or closed?", 0.0, 1.2, "Open right now?", "The sign tells you, with the hours", False),
]
APP = [
    (["redesign-menu-light.png", "redesign-home-light.png", "redesign-item-light.png"], "Now on Android", "Free on the website"),
    (["redesign-orders-light.png", "redesign-order-light.png", "redesign-rewards-light.png"], "Track & earn", "Orders and rewards in your pocket"),
    (["arcade-catch-light.png", "arcade-memory-light.png", "arcade-simon-dark.png"], "Arcade games", "Play while your drink is made"),
]
COLORS = ["#ffd9a8", "#fff1a6", "#c9f0d8", "#ddd5ff", "#c3e6ff", "#ffcfdb", "#ffe0b8", "#d4f5c4", "#e6d8ff", "#bff0ec", "#ffe9a0", "#ffd2c2"]

CSS = """
:root { --ink:#1d2a21; --green:#1f6b45; --paper:#fffaf2; }
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:{W}px; height:{H}px; overflow:hidden; background:#ffd9a8; }
body { font-family:'Inter', system-ui, sans-serif; color:var(--ink); }
#root { position:relative; width:100%; height:100%; overflow:hidden; background:#ffd9a8; }
#dots { position:absolute; inset:-120px; opacity:.35;
  background-image:radial-gradient(circle, #ffffff 0 7px, transparent 8px); background-size:72px 72px; }
.clip { position:absolute; }
.fred { font-family:'Fredoka', 'Inter', sans-serif; font-weight:700; }
.logo { left:{LX}px; top:{LY}px; display:flex; align-items:center; gap:14px; padding:10px 22px 10px 10px; border-radius:999px;
  background:var(--paper); border:4px solid var(--ink); box-shadow:5px 5px 0 var(--ink); }
.logo img { width:{LOGO}px; height:{LOGO}px; border-radius:50%; }
.logo span { font-size:{LOGOT}px; }
.tag { right:{LX}px; top:{TY}px; padding:10px 24px; border-radius:16px; background:var(--green); color:#fff; font-size:{TAG}px;
  letter-spacing:.06em; text-transform:uppercase; border:4px solid var(--ink); box-shadow:5px 5px 0 var(--ink); transform:rotate(3deg); }
.card { position:absolute; left:{CX}px; top:{CYY}px; width:{CW}px; height:{CH}px; border-radius:{CR}px; overflow:hidden;
  background:var(--paper); border:{CB}px solid #fff; box-shadow:0 0 0 4px var(--ink), 14px 14px 0 4px var(--ink); visibility:hidden; }
.card video { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.sticker { left:{SX}px; top:{SY}px; max-width:{SMAX}px; padding:{SPAD}; border-radius:26px; background:var(--paper);
  border:5px solid var(--ink); box-shadow:8px 8px 0 var(--ink); }
.sticker .t { font-size:{ST}px; line-height:1.05; }
.sticker .s { margin-top:8px; font-size:{SS}px; font-weight:600; color:#3f4b43; }
.demo { display:inline-block; margin-left:12px; padding:4px 12px; border-radius:999px; background:#ffe36e; border:3px solid var(--ink);
  font-family:'Inter', sans-serif; font-size:{DEMO}px; font-weight:800; vertical-align:middle; text-transform:uppercase; letter-spacing:.05em; }
.phone { position:absolute; width:{PW}px; height:{PH}px; border-radius:{PR}px; background:var(--ink); padding:{PB}px;
  box-shadow:12px 12px 0 rgba(29,42,33,.9); }
.phone img { width:100%; height:100%; border-radius:{PRI}px; object-fit:cover; display:block; }
.apptitle { left:0; width:100%; top:{AY}px; text-align:center; }
.apptitle .t { font-size:{AT}px; line-height:1; }
.apptitle .s { margin-top:14px; font-size:{AS}px; font-weight:600; color:#3f4b43; }
.center { left:0; top:0; width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:{GAP}px; text-align:center; }
.center img { width:{BIGLOGO}px; height:{BIGLOGO}px; border-radius:50%; border:6px solid var(--ink); box-shadow:10px 10px 0 var(--ink); }
.big { font-size:{BIG}px; line-height:.95; }
.lead { font-size:{LEAD}px; font-weight:600; color:#3f4b43; max-width:{LEADW}px; }
.chip { padding:16px 34px; border-radius:999px; background:var(--green); color:#fff; font-size:{CHIP}px; font-weight:800;
  border:4px solid var(--ink); box-shadow:6px 6px 0 var(--ink); }
"""

LAND = dict(W=1920, H=1080, LX=56, LY=40, LOGO=52, LOGOT=30, TY=46, TAG=22,
            CX=270, CYY=128, CW=1380, CH=776, CR=34, CB=10,
            SX=150, SY=790, SMAX=1000, SPAD="22px 34px", ST=58, SS=28, DEMO=18,
            PW=330, PH=700, PR=46, PB=12, PRI=36, AY=850, AT=86, AS=32,
            GAP=26, BIGLOGO=220, BIG=150, LEAD=38, LEADW=1200, CHIP=34)
VERT = dict(W=1080, H=1920, LX=48, LY=56, LOGO=60, LOGOT=34, TY=64, TAG=24,
            CX=110, CYY=200, CW=860, CH=1420, CR=44, CB=12,
            SX=60, SY=1500, SMAX=960, SPAD="24px 34px", ST=62, SS=30, DEMO=20,
            PW=360, PH=760, PR=50, PB=13, PRI=38, AY=1330, AT=96, AS=36,
            GAP=32, BIGLOGO=300, BIG=150, LEAD=40, LEADW=900, CHIP=34)

PHONE_SPOTS = {  # (left, top, rotation) for the three phones
    "landscape": [(470, 150, -9), (795, 110, 0), (1120, 150, 9)],
    "vertical": [(40, 360, -9), (360, 300, 0), (680, 360, 9)],
}


def css_for(v: dict) -> str:
    out = CSS
    for k, val in v.items():
        out = out.replace("{" + k + "}", str(val))
    return out


def e(s: str) -> str:
    return html.escape(s, quote=True)


def build(form: str, v: dict, page: str, music: str) -> tuple[float, list[float]]:
    vertical = form == "phone"
    W, H = v["W"], v["H"]
    els: list[str] = []
    anim: list[str] = []
    t = SCENE  # the intro is two bars too
    colors = itertools.cycle(COLORS)
    # ---- intro
    els.append('<div id="intro" class="clip center" data-start="0" data-duration="{:.2f}">'
               '<img src="assets/logo.png" alt=""><div class="big fred">Brew ni Cat</div>'
               '<div class="lead">Coffee, cats and a little fun, now online!</div></div>'.format(SCENE + WIPE))
    anim += ['tl.from("#intro img", {scale:0, rotation:-30, duration:0.7, ease:"back.out(2)"}, 0.1);',
             'tl.from("#intro .big", {y:60, scale:0.8, opacity:0, duration:0.55, ease:"back.out(2)"}, 0.4);',
             'tl.from("#intro .lead", {y:30, opacity:0, duration:0.45, ease:"power2.out"}, 0.75);',
             f'tl.to("#intro", {{scale:1.1, opacity:0, duration:{WIPE}, ease:"power2.in"}}, {SCENE - 0.1:.2f});']
    anim.append(f'tl.set("#root", {{backgroundColor:"{next(colors)}"}}, 0);')
    # ---- the website
    web_start = t
    for i, (clip, mark, after, rate, title, sub, demo) in enumerate(WEB):
        meta = json.load(open(os.path.join(PUBLIC, "demo", f"{clip}-{form}.json")))
        m0 = next((m["t"] for m in meta["marks"] if m["title"] == mark), 0.0)
        span = SCENE + WIPE
        src = max(0.0, min(m0 + after, meta["seconds"] - 0.3 - span * rate))
        rot = -1.6 if i % 2 else 1.4
        a = t
        els.append(f'<div id="w{i}" class="card" style="transform:rotate({rot}deg)">'
                   f'<video id="v{i}" class="clip" src="assets/demo/{clip}-{form}.mp4" muted playsinline data-start="{a:.2f}" '
                   f'data-duration="{span:.2f}" data-playback-start="{src:.2f}" data-playback-rate="{rate}"></video></div>')
        anim += [f'tl.set("#w{i}", {{visibility:"visible", zIndex:{10 + i}}}, {a:.2f});',
                 f'tl.fromTo("#w{i}", {{clipPath:"circle(0% at 50% 50%)"}}, {{clipPath:"circle(80% at 50% 50%)", duration:{WIPE}, ease:"power2.inOut"}}, {a:.2f});'
                 if i else f'tl.fromTo("#w{i}", {{y:{H}, rotation:12}}, {{y:0, rotation:{rot}, duration:0.6, ease:"back.out(1.3)"}}, {a - 0.1:.2f});',
                 f'tl.set("#w{i}", {{visibility:"hidden"}}, {a + span:.2f});',
                 f'tl.to("#root", {{backgroundColor:"{next(colors)}", duration:0.35}}, {a:.2f});']
        tag = '<span class="demo">Demo</span>' if demo else ""
        srot = -3 if i % 2 == 0 else 2.5
        els.append(f'<div id="st{i}" class="clip sticker" data-start="{a + 0.15:.2f}" data-duration="{SCENE - 0.15:.2f}" '
                   f'style="transform:rotate({srot}deg);z-index:60"><div class="t fred">{e(title)}{tag}</div><div class="s">{e(sub)}</div></div>')
        anim.append(f'tl.from("#st{i}", {{scale:0.4, opacity:0, rotation:{srot * 4}, duration:0.45, ease:"back.out(2.2)"}}, {a + 0.15:.2f});')
        t += SCENE
    web_end = t
    anim.append(f'tl.to("#w{len(WEB) - 1}", {{y:-{H}, rotation:-10, duration:{WIPE}, ease:"back.in(1.2)"}}, {web_end - 0.05:.2f});')
    # ---- the app
    app_start = t
    spots = PHONE_SPOTS["vertical" if vertical else "landscape"]
    for j, (imgs, title, sub) in enumerate(APP):
        a = t
        els.append(f'<div id="ap{j}" class="clip" data-start="{a:.2f}" data-duration="{SCENE:.2f}" style="left:0;top:0;width:100%;height:100%;z-index:{30 + j}">'
                   + "".join(f'<div id="ph{j}_{k}" class="phone" style="left:{x}px;top:{y}px;transform:rotate({r}deg)">'
                             f'<img src="assets/app/{img}" alt=""></div>' for k, ((x, y, r), img) in enumerate(zip(spots, imgs)))
                   + f'<div class="clip apptitle"><div class="t fred">{e(title)}</div><div class="s">{e(sub)}</div></div></div>')
        for k in range(3):
            anim.append(f'tl.from("#ph{j}_{k}", {{y:{H * 0.7:.0f}, rotation:{(k - 1) * 25}, duration:0.6, ease:"back.out(1.4)"}}, {a + 0.08 * k:.2f});')
        anim.append(f'tl.from("#ap{j} .apptitle", {{scale:0.5, opacity:0, duration:0.45, ease:"back.out(2)"}}, {a + 0.25:.2f});')
        anim.append(f'tl.to("#ap{j}", {{opacity:0, scale:0.92, duration:0.3, ease:"power2.in"}}, {a + SCENE - 0.3:.2f});')
        anim.append(f'tl.to("#root", {{backgroundColor:"{next(colors)}", duration:0.35}}, {a:.2f});')
        t += SCENE
    # ---- outro
    o0 = t
    total = round(o0 + OUTRO, 2)
    els.append(f'<div id="outro" class="clip center" data-start="{o0:.2f}" data-duration="{OUTRO}">'
               f'<img src="assets/logo.png" alt=""><div class="big fred">Come say hi!</div>'
               f'<div class="lead">Order ahead, play, earn rewards, and meet the cats in Kabacan.</div>'
               f'<div class="chip">{SITE}</div></div>')
    anim += [f'tl.to("#root", {{backgroundColor:"#fff1a6", duration:0.35}}, {o0:.2f});',
             f'tl.from("#outro img", {{scale:0, rotation:30, duration:0.7, ease:"back.out(2)"}}, {o0 + 0.05:.2f});',
             f'tl.from("#outro .big", {{y:60, scale:0.8, opacity:0, duration:0.55, ease:"back.out(2)"}}, {o0 + 0.35:.2f});',
             f'tl.from("#outro .lead", {{y:30, opacity:0, duration:0.45}}, {o0 + 0.65:.2f});',
             f'tl.from("#outro .chip", {{scale:0.3, opacity:0, rotation:-8, duration:0.55, ease:"back.out(2.4)"}}, {o0 + 0.9:.2f});']
    # ---- what stays on screen between the intro and the outro
    els.append(f'<div id="logo" class="clip logo fred" data-start="{web_start - 0.2:.2f}" data-duration="{o0 - web_start + 0.2:.2f}" style="z-index:80">'
               f'<img src="assets/logo.png" alt=""><span>Brew ni Cat</span></div>')
    anim.append(f'tl.from("#logo", {{y:-120, duration:0.5, ease:"back.out(1.8)"}}, {web_start - 0.2:.2f});')
    els.append(f'<div id="tagw" class="clip tag fred" data-start="{web_start:.2f}" data-duration="{web_end - web_start:.2f}" style="z-index:80">The website</div>')
    els.append(f'<div id="taga" class="clip tag fred" data-start="{app_start:.2f}" data-duration="{o0 - app_start:.2f}" style="z-index:80">The app</div>')
    anim += [f'tl.from("#tagw", {{scale:0, duration:0.4, ease:"back.out(2.4)"}}, {web_start:.2f});',
             f'tl.from("#taga", {{scale:0, duration:0.4, ease:"back.out(2.4)"}}, {app_start:.2f});',
             f'tl.fromTo("#dots", {{x:0, y:0}}, {{x:-216, y:-144, duration:{total}, ease:"none"}}, 0);']
    doc = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width={W}, height={H}" />
    <title>Brew ni Cat showcase</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@700&family=Inter:wght@600;800&display=block" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>{css_for(v)}</style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{total}" data-width="{W}" data-height="{H}" data-fps="30">
      <div id="dots"></div>
      {chr(10).join("      " + x for x in els)}
      <audio id="music" class="clip" src="assets/{music}" data-start="0" data-duration="{total}" data-volume="0.95"></audio>
    </div>
    <script>
      const tl = gsap.timeline({{ paused: true }});
      {chr(10).join("      " + a for a in anim)}
      tl.set({{}}, {{}}, {total});
      window.__timelines = window.__timelines || {{}};
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
"""
    with open(os.path.join(HERE, page, "index.html"), "w") as f:
        f.write(doc)
    return total, [web_start, app_start, o0]


def main() -> None:
    if not os.path.isdir(os.path.join(ASSETS, "demo")):
        raise SystemExit("run python3 build.py first (it copies the recordings into assets/)")
    for form, v, page, music in (("desk", LAND, "showcase-landscape", "showcase.mp3"),
                                 ("phone", VERT, "showcase-vertical", "showcase-vertical.mp3")):
        os.makedirs(os.path.join(HERE, page), exist_ok=True)
        link = os.path.join(HERE, page, "assets")
        if not os.path.lexists(link):
            os.symlink("../assets", link)
        total, starts = build(form, v, page, music)
        wav = os.path.join(ASSETS, music.replace(".mp3", ".wav"))
        subprocess.run(["python3", os.path.join(HERE, "make_music.py"), str(total), wav, *map(str, starts)], check=True)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", wav, "-b:a", "192k", os.path.join(ASSETS, music)], check=True)
        os.remove(wav)
        print(f"{page}: {total:.1f}s")


if __name__ == "__main__":
    main()
