"""Build the website tour video (HyperFrames): landscape/index.html (1920x1080)
and vertical/index.html (1080x1920), plus their music.

    python3 build.py

Reads the screen recordings made by ../scripts/record-demos (desk clips for the
landscape tour, phone clips for the vertical one) from ../public/demo, with the
captions each recording marked. Copies them, the logo and the app screenshots
into assets/, writes both compositions and synthesises the music to fit
(make_music.py). Then render with `npm run render` / `npm run render:vertical`.
"""

from __future__ import annotations

import html
import json
import os
import shutil
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(HERE, "..", "public")
ASSETS = os.path.join(HERE, "assets")
SITE = "brew-ni-cat-connect.vercel.app"

INTRO = 3.6
OUTRO = 4.4
FADE = 0.45  # crossfade between recordings
APP_SHOT = 2.6

# (recordings, section name)
SECTIONS = [
    (["home"], "Home"),
    (["order"], "Order online"),
    (["rider"], "Rider delivery"),
    (["signin"], "Account & rewards"),
    (["games"], "Cat games"),
    (["review"], "Reviews"),
    (["about", "gallery"], "About & gallery"),
    (["contact"], "Contact"),
]
APP = [
    ("redesign-home-light.png", "The Android app", "Order, track and earn on your phone"),
    ("redesign-menu-light.png", "The full menu", "The same live menu as the website"),
    ("redesign-item-light.png", "Pick your options", "Sizes and add-ons, then add to cart"),
    ("redesign-order-light.png", "Order sent", "Follow every step until pickup"),
    ("redesign-orders-light.png", "Your orders", "Every past order in one list"),
    ("redesign-rewards-light.png", "Rewards & points", "Redeem rewards right in the app"),
    ("arcade-sheet-light.png", "Play while you wait", "Five free arcade games"),
    ("arcade-catch-light.png", "Treat Catcher", "Slide the cat to catch the treats"),
    ("arcade-memory-light.png", "Cat Match", "Flip the cards and find the pairs"),
    ("arcade-simon-dark.png", "Paw Says", "Repeat the pattern, in night mode too"),
]

CSS = """
:root { --cream:#f6eee1; --warm:#ecdfcb; --ink:#1d2a21; --muted:#4b5a4f; --green:#1f6b45;
  --mint:#7dcfa0; --peach:#e9a06e; --rust:#9e451e; }
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:{W}px; height:{H}px; overflow:hidden; background:var(--cream); }
body { font-family:'Inter', system-ui, sans-serif; color:var(--ink); }
#root { position:relative; width:100%; height:100%; overflow:hidden; background:var(--cream); }
.blob { position:absolute; border-radius:50%; filter:blur(60px); opacity:.55; }
.b1 { width:{B1}px; height:{B1}px; left:-8%; top:-12%; background:var(--mint); }
.b2 { width:{B2}px; height:{B2}px; right:-10%; bottom:-14%; background:var(--peach); }
.b3 { width:{B3}px; height:{B3}px; right:18%; top:-10%; background:#f3d9a8; }
.paw { position:absolute; width:46px; height:46px; opacity:.12; }
.clip { position:absolute; }
.header { left:{HX}px; top:{HY}px; display:flex; align-items:center; gap:14px; }
.header img { width:{LOGO}px; height:{LOGO}px; border-radius:50%; box-shadow:0 4px 14px rgba(0,0,0,.12); }
.brand { font-family:'Big Shoulders', 'Inter', sans-serif; font-weight:900; font-size:{BRAND}px; letter-spacing:.01em; line-height:1; }
.brand small { display:block; font-family:'Inter', sans-serif; font-weight:600; font-size:{BRANDS}px; color:var(--green); letter-spacing:0; margin-top:4px; }
.pill { right:{HX}px; top:{PY}px; padding:12px 22px; border-radius:999px; background:#fff; color:var(--green);
  font-weight:700; font-size:{PILL}px; box-shadow:0 6px 20px rgba(31,107,69,.15); display:flex; gap:12px; align-items:center; }
.pill b { background:var(--green); color:#fff; border-radius:999px; padding:3px 12px; font-size:{PILLN}px; }
.frame { position:absolute; left:{FX}px; top:{FY}px; width:{FW}px; height:{FH}px; border-radius:{FR}px; background:#fff;
  box-shadow:0 30px 80px rgba(29,42,33,.22), 0 0 0 1px rgba(29,42,33,.06); overflow:hidden; }
.bar { position:absolute; left:0; top:0; right:0; height:{BAR}px; background:#fbf7f1; border-bottom:1px solid #eee3d3;
  display:flex; align-items:center; gap:10px; padding:0 18px; }
.bar i { width:13px; height:13px; border-radius:50%; display:block; }
.url { margin-left:18px; flex:1; max-width:560px; height:26px; border-radius:999px; background:#fff; border:1px solid #eee3d3;
  font-size:14px; color:var(--muted); display:flex; align-items:center; padding:0 14px; }
.screen { position:absolute; left:0; top:{BAR}px; width:{SW}px; height:{SH}px; overflow:hidden; background:var(--cream); }
.screen video { position:absolute; left:0; top:0; width:100%; height:100%; object-fit:cover; }
.cap { left:50%; top:{CY}px; transform:translateX(-50%); max-width:{CMAX}px; padding:{CPAD}; border-radius:24px; background:#fff;
  box-shadow:0 10px 30px rgba(29,42,33,.14); display:flex; align-items:center; gap:16px; white-space:nowrap; }
.cap .dot { width:14px; height:14px; border-radius:50%; background:var(--green); flex:none; box-shadow:0 0 0 6px rgba(125,207,160,.35); }
.cap .t { font-weight:800; font-size:{CT}px; color:var(--ink); }
.cap .s { font-weight:500; font-size:{CS}px; color:var(--muted); }
.vcap { flex-direction:column; align-items:center; gap:6px; white-space:normal; text-align:center; width:{CMAX}px; }
.vcap .dot { display:none; }
.center { left:0; top:0; width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:{GAP}px; }
.center img { width:{BIGLOGO}px; height:{BIGLOGO}px; border-radius:50%; box-shadow:0 20px 60px rgba(29,42,33,.25); }
.big { font-family:'Big Shoulders', 'Inter', sans-serif; font-weight:900; font-size:{BIG}px; line-height:.95; color:var(--green); }
.lead { font-size:{LEAD}px; font-weight:600; color:var(--muted); }
.chip { display:inline-block; margin-top:6px; padding:14px 28px; border-radius:999px; background:var(--green); color:#fff; font-weight:700; font-size:{CHIP}px; }
.phone { position:absolute; left:{PX}px; top:{PHY}px; width:{PW}px; height:{PH}px; border-radius:{PR}px; background:#111;
  padding:{PB}px; box-shadow:0 30px 80px rgba(29,42,33,.3); }
.phone .shot { position:absolute; left:{PB}px; top:{PB}px; width:calc(100% - {PB2}px); height:calc(100% - {PB2}px); border-radius:{PRI}px; object-fit:cover; }
.apptext { left:{AX}px; top:{AY}px; width:{AW}px; }
.apptext .t { font-family:'Big Shoulders', 'Inter', sans-serif; font-weight:900; font-size:{AT}px; color:var(--green); line-height:1; }
.apptext .s { margin-top:18px; font-size:{AS}px; font-weight:600; color:var(--muted); }
"""

LAND = dict(W=1920, H=1080, B1=700, B2=760, B3=420, HX=70, HY=26, LOGO=58, BRAND=38, BRANDS=15, PY=30, PILL=22, PILLN=18,
            FX=230, FY=104, FW=1460, FH=860, FR=22, BAR=38, SW=1460, SH=822, CY=984, CMAX=1700, CPAD="16px 30px",
            CT=28, CS=24, GAP=26, BIGLOGO=230, BIG=118, LEAD=34, CHIP=26,
            PX=470, PHY=150, PW=380, PH=800, PR=54, PB=12, PB2=24, PRI=44, AX=960, AY=420, AW=760, AT=84, AS=34)
VERT = dict(W=1080, H=1920, B1=700, B2=760, B3=420, HX=48, HY=40, LOGO=64, BRAND=40, BRANDS=16, PY=50, PILL=24, PILLN=19,
            FX=110, FY=150, FW=860, FH=1529, FR=46, BAR=0, SW=860, SH=1529, CY=1712, CMAX=940, CPAD="20px 30px",
            CT=34, CS=27, GAP=30, BIGLOGO=300, BIG=128, LEAD=38, CHIP=30,
            PX=240, PHY=210, PW=600, PH=1290, PR=74, PB=16, PB2=32, PRI=60, AX=60, AY=1560, AW=960, AT=78, AS=34)

PAW = ('<svg class="paw" viewBox="0 0 24 24" style="{s}"><g fill="#1f6b45"><ellipse cx="12" cy="15.5" rx="5" ry="4.2"/>'
       '<circle cx="6" cy="9.5" r="2.2"/><circle cx="10" cy="6.5" r="2.2"/><circle cx="14" cy="6.5" r="2.2"/><circle cx="18" cy="9.5" r="2.2"/></g></svg>')


def css_for(v: dict) -> str:
    out = CSS
    for k, val in v.items():
        out = out.replace("{" + k + "}", str(val))
    return out


def e(s: str) -> str:
    return html.escape(s, quote=True)


def build(form: str, v: dict, out_name: str, music_name: str) -> tuple[float, list[float]]:
    vertical = form == "phone"
    els: list[str] = []
    anim: list[str] = []
    t = INTRO
    section_starts: list[float] = []
    n_sections = len(SECTIONS) + 1
    clip_id = 0
    # ---- intro
    els.append(f'<div id="intro" class="clip center" data-start="0" data-duration="{INTRO}">'
               f'<img src="assets/logo.png" alt=""><div class="big">Brew ni Cat</div>'
               f'<div class="lead">Come take a tour of our website!</div></div>')
    anim += ['tl.from("#intro img", {scale:0.3, opacity:0, rotation:-20, duration:0.7, ease:"back.out(1.8)"}, 0.1);',
             'tl.from("#intro .big", {y:40, opacity:0, duration:0.5, ease:"back.out(1.6)"}, 0.45);',
             'tl.from("#intro .lead", {y:30, opacity:0, duration:0.5, ease:"power2.out"}, 0.75);',
             f'tl.to("#intro", {{opacity:0, scale:0.96, duration:0.4, ease:"power2.in"}}, {INTRO - 0.4});']
    # ---- recordings
    tour_start = t
    vids: list[str] = []
    caps: list[str] = []
    pills: list[str] = []
    for si, (clips, name) in enumerate(SECTIONS, start=1):
        s0 = t
        section_starts.append(s0)
        for clip in clips:
            meta = json.load(open(os.path.join(PUBLIC, "demo", f"{clip}-{form}.json")))
            dur = round(meta["seconds"] - 0.2, 2)
            clip_id += 1
            vid = f"v{clip_id}"
            # each recording stays a little into the next one, which fades in over it
            vids.append(f'<video id="{vid}" class="clip" src="assets/demo/{clip}-{form}.mp4" muted playsinline '
                        f'data-start="{t:.2f}" data-duration="{dur + FADE:.2f}" style="z-index:{clip_id}"></video>')
            if clip_id > 1:
                anim.append(f'tl.fromTo("#{vid}", {{opacity:0}}, {{opacity:1, duration:{FADE}, ease:"none"}}, {t:.2f});')
            marks = meta["marks"]
            for mi, m in enumerate(marks):
                a = t + max(0.0, m["t"])
                b = t + (marks[mi + 1]["t"] if mi + 1 < len(marks) else dur)
                if b - a < 0.6:
                    continue
                clip_id += 1
                cid = f"c{clip_id}"
                cls = "clip cap vcap" if vertical else "clip cap"
                caps.append(f'<div id="{cid}" class="{cls}" data-start="{a:.2f}" data-duration="{b - a:.2f}">'
                            f'<span class="dot"></span><span class="t">{e(m["title"])}</span>'
                            f'<span class="s">{e(m.get("sub", ""))}</span></div>')
                anim.append(f'tl.from("#{cid}", {{y:24, opacity:0, duration:0.35, ease:"back.out(1.7)"}}, {a:.2f});')
            t += dur
        pid = f"p{si}"
        pills.append(f'<div id="{pid}" class="clip pill" data-start="{s0:.2f}" data-duration="{t - s0:.2f}">'
                     f'<b>{si}/{n_sections}</b>{e(name)}</div>')
        anim.append(f'tl.from("#{pid}", {{x:40, opacity:0, duration:0.4, ease:"back.out(1.6)"}}, {s0:.2f});')
    tour_end = t
    bar = ('<div class="bar"><i style="background:#ff6058"></i><i style="background:#ffbd2e"></i><i style="background:#28c840"></i>'
           f'<div class="url">{SITE}</div></div>') if not vertical else ""
    # the window is not timed itself (its videos are); GSAP shows and hides it
    els.append(f'<div id="frame" class="frame" style="opacity:0">{bar}<div class="screen">{"".join(vids)}</div></div>')
    anim += [f'tl.fromTo("#frame", {{y:80, opacity:0, scale:0.94}}, {{y:0, opacity:1, scale:1, duration:0.6, ease:"back.out(1.4)"}}, {tour_start - 0.3:.2f});',
             f'tl.to("#frame", {{y:-40, opacity:0, scale:0.96, duration:0.4, ease:"power2.in"}}, {tour_end - 0.1:.2f});']
    els += caps + pills
    # ---- the app
    s0 = t + 0.3
    section_starts.append(s0)
    t = s0
    app_dur = len(APP) * APP_SHOT
    els.append(f'<div id="phone" class="phone" style="opacity:0">'
               + "".join(f'<img id="a{i}" class="clip shot" src="assets/app/{img}" alt="" data-start="{s0 + i * APP_SHOT:.2f}" '
                         f'data-duration="{APP_SHOT + (0.4 if i < len(APP) - 1 else 0):.2f}" style="z-index:{i + 1}">'
                         for i, (img, _, _) in enumerate(APP))
               + "</div>")
    anim.append(f'tl.fromTo("#phone", {{y:120, opacity:0, rotation:-4}}, {{y:0, opacity:1, rotation:0, duration:0.7, ease:"back.out(1.4)"}}, {s0:.2f});')
    anim.append(f'tl.to("#phone", {{y:60, opacity:0, duration:0.4, ease:"power2.in"}}, {s0 + app_dur - 0.4:.2f});')
    for i, (img, title, sub) in enumerate(APP):
        a = s0 + i * APP_SHOT
        if i:
            anim.append(f'tl.fromTo("#a{i}", {{opacity:0, x:40}}, {{opacity:1, x:0, duration:0.4, ease:"power2.out"}}, {a:.2f});')
        els.append(f'<div id="at{i}" class="clip apptext" data-start="{a:.2f}" data-duration="{APP_SHOT:.2f}"'
                   + (' style="text-align:center"' if vertical else "") + f'><div class="t">{e(title)}</div><div class="s">{e(sub)}</div></div>')
        anim.append(f'tl.from("#at{i}", {{y:30, opacity:0, duration:0.4, ease:"back.out(1.6)"}}, {a:.2f});')
    els.append(f'<div id="pApp" class="clip pill" data-start="{s0:.2f}" data-duration="{app_dur:.2f}"><b>{n_sections}/{n_sections}</b>Android app</div>')
    anim.append(f'tl.from("#pApp", {{x:40, opacity:0, duration:0.4, ease:"back.out(1.6)"}}, {s0:.2f});')
    t = s0 + app_dur
    # ---- outro
    o0 = t
    total = round(o0 + OUTRO, 2)
    els.append(f'<div id="outro" class="clip center" data-start="{o0:.2f}" data-duration="{OUTRO}">'
               f'<img src="assets/logo.png" alt=""><div class="big">See you at the café!</div>'
               f'<div class="lead">Order ahead, play, and earn rewards</div><div class="chip">{SITE}</div></div>')
    anim += [f'tl.from("#outro img", {{scale:0.3, opacity:0, rotation:20, duration:0.7, ease:"back.out(1.8)"}}, {o0 + 0.1:.2f});',
             f'tl.from("#outro .big", {{y:40, opacity:0, duration:0.5, ease:"back.out(1.6)"}}, {o0 + 0.4:.2f});',
             f'tl.from("#outro .lead", {{y:30, opacity:0, duration:0.5}}, {o0 + 0.7:.2f});',
             f'tl.from("#outro .chip", {{scale:0.6, opacity:0, duration:0.5, ease:"back.out(2)"}}, {o0 + 0.95:.2f});']
    # header and background stay the whole time
    header = (f'<div id="hdr" class="clip header" data-start="{INTRO - 0.3}" data-duration="{o0 - INTRO + 0.3:.2f}">'
              f'<img src="assets/logo.png" alt=""><div class="brand">Brew ni Cat<small>Website tour</small></div></div>')
    anim.append(f'tl.from("#hdr", {{x:-40, opacity:0, duration:0.5, ease:"back.out(1.6)"}}, {INTRO - 0.3});')
    W, H = v["W"], v["H"]
    paws = "".join(PAW.format(s=f"left:{x}px;top:{y}px;transform:rotate({r}deg)") for x, y, r in
                   ((W * 0.06, H * 0.8, -20), (W * 0.9, H * 0.18, 25), (W * 0.82, H * 0.88, 10), (W * 0.12, H * 0.25, 15)))
    # slow drifting background blobs, for life between the cuts
    anim += [f'tl.fromTo(".b1", {{x:0, y:0}}, {{x:{W * 0.12:.0f}, y:{H * 0.1:.0f}, duration:{total}, ease:"sine.inOut"}}, 0);',
             f'tl.fromTo(".b2", {{x:0, y:0}}, {{x:-{W * 0.1:.0f}, y:-{H * 0.08:.0f}, duration:{total}, ease:"sine.inOut"}}, 0);',
             f'tl.fromTo(".b3", {{x:0}}, {{x:-{W * 0.2:.0f}, duration:{total}, ease:"sine.inOut"}}, 0);']
    doc = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width={W}, height={H}" />
    <title>Brew ni Cat website tour</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders:wght@900&family=Inter:wght@500;600;700;800&display=block" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>{css_for(v)}</style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{total}" data-width="{W}" data-height="{H}" data-fps="30">
      <div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div>
      {paws}
      {header}
      {chr(10).join("      " + x for x in els)}
      <audio id="music" class="clip" src="assets/{music_name}" data-start="0" data-duration="{total}" data-volume="0.9"></audio>
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
    with open(os.path.join(HERE, out_name, "index.html"), "w") as f:
        f.write(doc)
    return total, section_starts


def main() -> None:
    os.makedirs(os.path.join(ASSETS, "demo"), exist_ok=True)
    os.makedirs(os.path.join(ASSETS, "app"), exist_ok=True)
    shutil.copy(os.path.join(PUBLIC, "brand", "logo.png"), os.path.join(ASSETS, "logo.png"))
    for img, _, _ in APP:
        shutil.copy(os.path.join(PUBLIC, "app", img), os.path.join(ASSETS, "app", img))
    for form in ("desk", "phone"):
        for clips, _ in SECTIONS:
            for c in clips:
                src = os.path.join(PUBLIC, "demo", f"{c}-{form}.mp4")
                dst = os.path.join(ASSETS, "demo", f"{c}-{form}.mp4")
                if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
                    shutil.copy(src, dst)
    # one HyperFrames project per shape (a project has one root composition);
    # both share assets/ through a symlink
    for form, v, page, music in (("desk", LAND, "landscape", "music.mp3"), ("phone", VERT, "vertical", "music-vertical.mp3")):
        os.makedirs(os.path.join(HERE, page), exist_ok=True)
        link = os.path.join(HERE, page, "assets")
        if not os.path.lexists(link):
            os.symlink("../assets", link)
        total, starts = build(form, v, page, music)
        wav = os.path.join(ASSETS, music.replace(".mp3", ".wav"))
        subprocess.run(["python3", os.path.join(HERE, "make_music.py"), str(total), wav, *map(str, starts)], check=True)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", wav, "-b:a", "192k", os.path.join(ASSETS, music)], check=True)
        os.remove(wav)
        print(f"{page}: {total:.1f}s, {len(starts)} sections")


if __name__ == "__main__":
    main()
