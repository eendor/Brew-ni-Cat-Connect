# Brew ni Cat promo video

A 48-second motion-graphics ad for the website and the Android app, made with
[Remotion](https://www.remotion.dev). It has its own `package.json` and is not
part of the website build.

| Composition     | Size      | Output                               |
| --------------- | --------- | ------------------------------------ |
| `Promo`         | 1920×1080 | `out/brew-ni-cat-promo.mp4`          |
| `PromoVertical` | 1080×1920 | `out/brew-ni-cat-promo-vertical.mp4` |

```bash
cd promo
npm install
npm run studio           # preview and edit in the browser
npm run render           # landscape MP4
npm run render:vertical  # 9:16 for Reels, TikTok and Stories
```

`npm run assets` (run by every script above) copies the logo, menu photos, cat
photos and app screenshots from the main project into `public/`. Only cat
photos are used from `public/images/shop/`, so no customers appear.

## Scenes

1. Logo and name, with a shockwave, paw burst and a cat peeking up
2. Menu photos: "Coffee, comfort, and a little cat energy."
3. Website: "Order ahead online" (matcha hero, then the menu, plus the phone layout)
4. Website ordering: "Pick it. Build it. Track it." (menu, size and flavor, live order status)
5. Website perks: rewards points, cat games, the gallery, and where to find us
6. "Now on Android" (the music drops)
7. App features: ordering, live tracking, rewards, order history
8. Play while you wait: the arcade games
9. The café cats
10. Call to action: website address, Android app, location

Scenes change with Remotion's shader transitions (zoom blur, cross zoom,
swap, ripple, film burn, dreamy zoom, book flip, crosswarp) and a clock wipe.
Each change also gets a warm light leak, and the whole video has a light film
grain and vignette. The effects (`Burst`, `Sparkles`, `Rays`, `Shockwave`,
`Glare`, `LightLeak`, `CatPeek`, `useShake`) are in `src/components.tsx`.

Website stills in `public/web/` (`site-*.jpg` desktop, `m-*.jpg` phone) are
single frames from screen recordings of the website running against mock
data on 2026-11-18, so no real orders or customers appear. Nothing in the
video navigates a live site. App screenshots come from
`docs/evidence/phase-8/android-app/` and were also taken against the mock
backend, so the opening hours shown in them are mock values.

The first version of the video (44 s, no shader transitions) is kept as
`out/brew-ni-cat-promo-v1.mp4` and `out/brew-ni-cat-promo-vertical-v1.mp4`
locally; it is in git history too.

## Sound

The music and sound effects in `public/audio/` are synthesised by
`scripts/make-audio.py` (numpy only), so there is nothing to license. The music
is a 120 BPM track in F major: a soft intro, a groove for the website, a
build-up that drops on "Now on Android", a lighter section for the cats and a
final chord on the call to action. The cat sounds (meow, kitten mew, chirp,
trill, purr, paw pats) are synthesised too, from a gliding pitch and moving
formants. `src/Soundtrack.tsx` places the effects (swooshes on scene changes,
pops, chimes on the checkmarks, a boing on the price sticker, coins for
rewards, 8-bit blips for the games, cat sounds whenever a cat appears, a
sparkle on the URL) and sets the volumes.

To change the music, edit the script and run:

```bash
python3 scripts/make-audio.py
npx remotion ffmpeg -y -i public/audio/music.wav -b:a 192k public/audio/music.mp3
rm public/audio/music.wav
```

To use a licensed track instead, replace `public/audio/music.mp3`.

Remotion is free for individuals and companies of up to three people; see its
[license](https://www.remotion.dev/license).
