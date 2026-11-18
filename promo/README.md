# Brew ni Cat promo video

A 44-second motion-graphics ad for the website and the Android app, made with
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

1. Logo and name
2. Menu photos: "Coffee, comfort, and a little cat energy."
3. Website: order ahead online (home, then menu)
4. Website: menu, games and gallery, plus the phone layout
5. "Now on Android"
6. App features: ordering, live tracking, rewards, order history
7. Play while you wait: the five arcade games
8. The café cats
9. Call to action: website address, Android app, location

Website captures in `public/web/` were taken from the live site on 2026-11-18.
App screenshots come from `docs/evidence/phase-8/android-app/` and were taken
against the mock backend, so the opening hours shown in them are mock values.

There is no soundtrack. To add one, put a licensed track in `public/` and add
`<Audio src={staticFile("music.mp3")} />` inside `Promo` in `src/Promo.tsx`.

Remotion is free for individuals and companies of up to three people; see its
[license](https://www.remotion.dev/license).
