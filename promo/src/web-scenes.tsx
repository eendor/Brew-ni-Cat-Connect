import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  Browser,
  Burst,
  type BurstKind,
  Check,
  Chip,
  clamp,
  easeInOut,
  easeOut,
  Headline,
  Kicker,
  Paws,
  Phone,
  Rays,
  Sparkles,
  usePop,
  useVertical,
  Washes,
} from "./components";
import { body, c, display } from "./theme";

/**
 * Website scenes. Every image is a still from the mocked demo recordings
 * (public/web/site-*.jpg are desktop, 1920 x 1080; m-*.jpg are phone,
 * 1080 x 1920), so nothing here navigates a live site.
 */
const DESK = 1080 / 1920;
const MOBILE = 1920 / 1080;
const pad = (vertical: boolean) => (vertical ? 80 : 120);

/* 3. Website hero: matcha, then the menu ---------------------------------- */
export const WebHero: React.FC = () => {
  const frame = useCurrentFrame();
  const vertical = useVertical();
  const swing = usePop(0, 13, 1);
  const rotY = -48 * (1 - swing) + interpolate(frame, [0, 150], [-16, -6]);
  const mix = interpolate(frame, [70, 88], [0, 1], {
    ...clamp,
    easing: easeInOut,
  });
  const zoom = interpolate(frame, [0, 70], [1, 1.1], clamp);
  const phone = usePop(30, 11, 0.8);
  const bw = vertical ? 940 : 1120;
  const chips = [
    "Full menu with live prices",
    "Order ahead for pickup",
    "Track your order live",
  ];
  return (
    <AbsoluteFill>
      <Washes />
      <Paws seed={4} count={8} />
      <Rays
        x={vertical ? "50%" : "68%"}
        y={vertical ? "38%" : "50%"}
        color="rgba(255,255,255,0.55)"
        opacity={0.8}
      />
      <AbsoluteFill
        style={{
          flexDirection: vertical ? "column" : "row",
          alignItems: vertical ? "flex-start" : "center",
          justifyContent: vertical ? "flex-start" : "center",
          padding: pad(vertical),
          paddingTop: vertical ? 130 : pad(vertical),
          gap: vertical ? 70 : 30,
        }}
      >
        <div
          style={{
            width: vertical ? "100%" : 620,
            display: "flex",
            flexDirection: "column",
            gap: 26,
            zIndex: 2,
          }}
        >
          <Kicker delay={6}>The website</Kicker>
          <Headline
            text={"Order ahead\nonline."}
            delay={10}
            size={vertical ? 150 : 140}
          />
          {!vertical ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 16,
                marginTop: 10,
              }}
            >
              {chips.map((t, i) => (
                <Chip key={t} delay={36 + i * 10} icon={<Check />} size={30}>
                  {t}
                </Chip>
              ))}
            </div>
          ) : null}
        </div>
        <div
          style={{
            perspective: 2200,
            alignSelf: "center",
            position: "relative",
          }}
        >
          <Browser
            src="web/site-matcha.jpg"
            next="web/site-menu.jpg"
            mix={mix}
            zoom={zoom}
            width={bw}
            aspect={DESK}
            glareAt={86}
            style={{
              transform: `translateX(${(1 - swing) * 500}px) rotateY(${rotY}deg) rotateX(5deg)`,
              opacity: Math.min(1, swing * 1.4),
            }}
          />
          <div
            style={{
              position: "absolute",
              left: vertical ? undefined : -120,
              right: vertical ? -10 : undefined,
              top: vertical ? 380 : 230,
              transform: `translateY(${(1 - phone) * 700}px) rotate(${(vertical ? 6 : -7) * phone}deg)`,
            }}
          >
            <Phone
              src="web/m-matcha.jpg"
              next="web/m-buldak.jpg"
              mix={mix}
              aspect={MOBILE}
              height={vertical ? 820 : 520}
              glareAt={60}
            />
          </div>
        </div>
        {vertical ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 16,
              marginTop: 30,
            }}
          >
            {chips.map((t, i) => (
              <Chip key={t} delay={36 + i * 10} icon={<Check />} size={30}>
                {t}
              </Chip>
            ))}
          </div>
        ) : null}
      </AbsoluteFill>
      <Sparkles
        seed={2}
        count={10}
        from={20}
        area={vertical ? [80, 560, 920, 700] : [760, 180, 1100, 720]}
      />
    </AbsoluteFill>
  );
};

/* 4. Ordering: pick it, build it, track it -------------------------------- */
export const ORDER_BEAT = 50;
const ORDER = [
  { word: "Pick it.", desk: "web/site-buldak.jpg", m: "web/m-buldak.jpg" },
  { word: "Build it.", desk: "web/site-build.jpg", m: "web/m-build.jpg" },
  { word: "Track it.", desk: "web/site-track.jpg", m: "web/m-track.jpg" },
];

export const WebOrder: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vertical = useVertical();
  const enter = (i: number) =>
    spring({
      frame: frame - 4 - i * ORDER_BEAT,
      fps,
      config: { damping: 14, mass: 0.9 },
    });
  const active = Math.min(
    ORDER.length - 1,
    Math.max(0, Math.floor((frame - 4) / ORDER_BEAT)),
  );
  const price = usePop(ORDER_BEAT + 26, 9, 0.7);
  const placed = usePop(2 * ORDER_BEAT + 18, 10, 0.7);
  const cw = 1180;
  const ph = 1180;
  return (
    <AbsoluteFill>
      <Washes />
      <Paws seed={8} count={6} />
      <div
        style={{
          position: "absolute",
          left: pad(vertical),
          right: pad(vertical),
          top: vertical ? 120 : 70,
          display: "flex",
          flexDirection: vertical ? "column" : "row",
          gap: vertical ? 0 : 34,
          justifyContent: "center",
          fontFamily: display,
          fontWeight: 900,
          fontSize: vertical ? 120 : 112,
          lineHeight: 0.95,
          textTransform: "uppercase",
          zIndex: 5,
        }}
      >
        {ORDER.map((o, i) => {
          const p = enter(i);
          const on = i === active;
          return (
            <span
              key={o.word}
              style={{
                display: "inline-block",
                color: on ? c.action : "rgba(29,42,33,0.28)",
                opacity: Math.min(1, p * 1.5),
                transform: `translateY(${(1 - p) * 60}px) scale(${on ? 1 : 0.92})`,
                transformOrigin: "left bottom",
              }}
            >
              {o.word}
            </span>
          );
        })}
      </div>
      <AbsoluteFill
        style={{
          perspective: 2400,
          alignItems: "center",
          justifyContent: "center",
          paddingTop: vertical ? 360 : 190,
        }}
      >
        {ORDER.map((o, i) => {
          const p = enter(i);
          if (p <= 0.001) return null;
          // How far later cards have pushed this one back.
          const d = ORDER.slice(i + 1).reduce(
            (n, _, j) => n + enter(i + 1 + j),
            0,
          );
          const x = (1 - p) * 900 - d * (vertical ? 70 : 150);
          const y = -d * (vertical ? 60 : 40);
          const s = 1 - d * 0.1;
          return (
            <div
              key={o.word}
              style={{
                position: "absolute",
                transform: `translate(${x}px, ${y}px) rotateY(${(1 - p) * 70 - d * 6}deg) scale(${s})`,
                opacity: Math.min(1, p * 2) * (1 - d * 0.35),
                filter: d > 0.01 ? `brightness(${1 - d * 0.1})` : undefined,
                zIndex: i,
              }}
            >
              {vertical ? (
                <Phone
                  src={o.m}
                  aspect={MOBILE}
                  height={ph}
                  glareAt={4 + i * ORDER_BEAT + 12}
                />
              ) : (
                <Browser
                  src={o.desk}
                  aspect={DESK}
                  width={cw}
                  glareAt={4 + i * ORDER_BEAT + 12}
                />
              )}
            </div>
          );
        })}
        <Sticker
          scale={price}
          style={vertical ? { right: 70, top: 980 } : { right: 170, top: 560 }}
          rotate={-8}
          bg={c.accent}
        >
          16oz · ₱59
        </Sticker>
        <Sticker
          scale={placed}
          style={vertical ? { left: 70, top: 1640 } : { left: 200, top: 790 }}
          rotate={6}
          bg={c.action}
        >
          Order placed!
        </Sticker>
      </AbsoluteFill>
      <Burst
        at={2 * ORDER_BEAT + 18}
        x={vertical ? 300 : 420}
        y={vertical ? 1660 : 810}
        kind="confetti"
        count={34}
        speed={34}
        size={48}
        seed={4}
        life={50}
      />
    </AbsoluteFill>
  );
};

const Sticker: React.FC<{
  scale: number;
  rotate: number;
  bg: string;
  style: React.CSSProperties;
  children: React.ReactNode;
}> = ({ scale, rotate, bg, style, children }) => (
  <div
    style={{
      position: "absolute",
      zIndex: 20,
      padding: "22px 40px",
      borderRadius: 999,
      background: bg,
      color: c.white,
      fontFamily: display,
      fontWeight: 900,
      fontSize: 64,
      textTransform: "uppercase",
      letterSpacing: "0.01em",
      boxShadow: "0 24px 50px rgba(29,42,33,0.35)",
      border: "5px solid #fff",
      transform: `scale(${scale}) rotate(${rotate * scale}deg)`,
      ...style,
    }}
  >
    {children}
  </div>
);

/* 5. Website perks: rewards, games, gallery, find us ---------------------- */
export const PERK_BEAT = 58;
type Perk = {
  kicker: string;
  title: string;
  desk: string;
  m?: string;
  origin: string;
  zoomTo?: number;
  kind: BurstKind;
  color?: string;
};
const PERKS: Perk[] = [
  {
    kicker: "Loyalty & rewards",
    title: "Earn points\non every order",
    desk: "web/site-rewards.jpg",
    m: "web/m-points.jpg",
    origin: "20% 30%",
    kind: "coin",
  },
  {
    kicker: "Cat games",
    title: "Play with\nthe café cats",
    desk: "web/site-games.jpg",
    m: "web/m-games.jpg",
    origin: "72% 70%",
    kind: "paw",
    color: c.peach,
  },
  {
    kicker: "Gallery",
    title: "Peek inside\nthe café",
    desk: "web/site-gallery.jpg",
    m: "web/m-gallery.jpg",
    origin: "50% 55%",
    kind: "heart",
    color: "#ef7f8f",
  },
  {
    kicker: "Visit us",
    title: "Find us on\nAbellera St",
    desk: "web/site-open.jpg",
    origin: "40% 50%",
    zoomTo: 1.1,
    kind: "star",
    color: "#ffe9a8",
  },
];

export const WebPerks: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vertical = useVertical();
  const k = Math.min(PERKS.length - 1, Math.floor(frame / PERK_BEAT));
  const t = frame - k * PERK_BEAT;
  const perk = PERKS[k]!;
  const last = k === PERKS.length - 1;
  const flipIn = spring({ frame: t, fps, config: { damping: 13, mass: 0.8 } });
  const flipOut = last
    ? 0
    : interpolate(t, [PERK_BEAT - 9, PERK_BEAT], [0, 1], {
        ...clamp,
        easing: easeInOut,
      });
  const angle = (1 - flipIn) * 95 - flipOut * 95;
  const zoom = interpolate(t, [6, PERK_BEAT + 10], [1, perk.zoomTo ?? 1.22], {
    ...clamp,
    easing: easeOut,
  });
  const textIn = interpolate(t, [2, 14], [0, 1], { ...clamp, easing: easeOut });
  const textOut = last
    ? 0
    : interpolate(t, [PERK_BEAT - 8, PERK_BEAT], [0, 1], clamp);
  const useDesk = !vertical || !perk.m;
  const points = Math.round(
    interpolate(t, [10, 34], [0, 60], { ...clamp, easing: easeOut }),
  );
  const burstX = vertical ? 540 : 1220;
  const burstY = vertical ? 1180 : 560;
  return (
    <AbsoluteFill>
      <Washes />
      <Paws seed={12 + k} count={8} />
      {last ? (
        <Rays
          x={vertical ? "50%" : "66%"}
          y={vertical ? "62%" : "52%"}
          color="rgba(255,226,160,0.6)"
          opacity={interpolate(t, [0, 20], [0, 1], clamp)}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: pad(vertical),
          top: vertical ? 130 : 0,
          bottom: vertical ? undefined : 0,
          width: vertical ? undefined : 600,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 22,
          zIndex: 5,
          opacity: textIn * (1 - textOut),
          transform: `translateY(${(1 - textIn) * 50 - textOut * 40}px)`,
        }}
      >
        <div
          style={{
            fontFamily: body,
            fontWeight: 700,
            fontSize: vertical ? 34 : 28,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: c.accent,
          }}
        >
          {perk.kicker}
        </div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 900,
            fontSize: vertical ? 132 : 120,
            lineHeight: 0.92,
            color: c.action,
            textTransform: "uppercase",
            whiteSpace: "pre-line",
          }}
        >
          {perk.title}
        </div>
        {k === 0 ? (
          <div
            style={{
              alignSelf: "flex-start",
              marginTop: 8,
              padding: "14px 30px",
              borderRadius: 999,
              background: "#f2b632",
              color: c.strong,
              fontFamily: display,
              fontWeight: 900,
              fontSize: vertical ? 64 : 58,
              boxShadow: "0 16px 34px rgba(200,134,26,0.35)",
            }}
          >
            +{points} pts
          </div>
        ) : null}
      </div>
      <AbsoluteFill
        style={{
          perspective: 2200,
          alignItems: vertical ? "center" : "flex-end",
          justifyContent: vertical ? "flex-end" : "center",
          paddingRight: vertical ? 0 : 90,
          paddingBottom: vertical ? 120 : 0,
        }}
      >
        <div
          style={{
            transform: `rotateY(${angle}deg) rotateX(${vertical ? 0 : 3}deg) rotateZ(${vertical ? 0 : -2}deg)`,
            opacity: Math.abs(angle) > 88 ? 0 : 1,
          }}
        >
          {useDesk ? (
            <ZoomShot
              src={perk.desk}
              width={vertical ? 940 : 1080}
              aspect={DESK}
              zoom={zoom}
              origin={perk.origin}
              glareAt={k * PERK_BEAT + 16}
            />
          ) : (
            <Phone
              src={perk.m!}
              aspect={MOBILE}
              height={1240}
              glareAt={k * PERK_BEAT + 16}
            />
          )}
        </div>
      </AbsoluteFill>
      {PERKS.map((p, i) => (
        <Burst
          key={p.kicker}
          at={i * PERK_BEAT + 14}
          x={burstX}
          y={burstY}
          kind={p.kind}
          color={p.color}
          count={p.kind === "coin" ? 22 : 16}
          speed={30}
          size={p.kind === "coin" ? 60 : 54}
          seed={i + 2}
          life={44}
        />
      ))}
      <Sparkles
        seed={9}
        count={12}
        from={3 * PERK_BEAT}
        color="#fff3c4"
        area={vertical ? [80, 900, 920, 700] : [720, 160, 1120, 760]}
      />
    </AbsoluteFill>
  );
};

/** A desktop screenshot in a browser frame that zooms toward a point. */
const ZoomShot: React.FC<{
  src: string;
  width: number;
  aspect: number;
  zoom: number;
  origin: string;
  glareAt: number;
}> = ({ src, width, aspect, zoom, origin, glareAt }) => (
  <div style={{ position: "relative" }}>
    <Browser
      src={src}
      width={width}
      aspect={aspect}
      zoom={zoom}
      glareAt={glareAt}
      origin={origin}
    />
  </div>
);
