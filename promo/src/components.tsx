import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { body, c, display, SITE } from "./theme";

export const useVertical = () => {
  const { width, height } = useVideoConfig();
  return height > width;
};

/** Spring from 0 to 1 starting at `delay` frames. */
export const usePop = (delay = 0, damping = 14, mass = 0.8) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, mass } });
};

export const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

/** Soft, slowly drifting colour washes like the website's background. */
export const Washes: React.FC<{ dark?: boolean }> = ({ dark }) => {
  const frame = useCurrentFrame();
  const blobs = dark
    ? [
        { x: 15, y: 20, r: 60, color: "rgba(125,207,160,0.22)" },
        { x: 85, y: 75, r: 70, color: "rgba(42,129,86,0.55)" },
        { x: 70, y: 10, r: 45, color: "rgba(233,160,110,0.16)" },
      ]
    : [
        { x: 12, y: 18, r: 55, color: "rgba(47,122,82,0.16)" },
        { x: 88, y: 82, r: 65, color: "rgba(233,160,110,0.30)" },
        { x: 75, y: 12, r: 40, color: "rgba(102,128,108,0.16)" },
      ];
  return (
    <AbsoluteFill
      style={{
        background: dark
          ? `linear-gradient(150deg, ${c.actionBright} 0%, ${c.action} 40%, ${c.actionDeep} 100%)`
          : c.canvas,
        overflow: "hidden",
      }}
    >
      {blobs.map((b, i) => {
        const dx = Math.sin(frame / 90 + i * 2) * 4;
        const dy = Math.cos(frame / 110 + i) * 4;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${b.x + dx}%`,
              top: `${b.y + dy}%`,
              width: `${b.r}vmax`,
              height: `${b.r}vmax`,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              background: `radial-gradient(circle, ${b.color} 0%, transparent 65%)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Paw prints that drift upward, for a bit of cat energy in the background. */
export const Paws: React.FC<{
  color?: string;
  count?: number;
  seed?: number;
}> = ({ color = "rgba(31,107,69,0.10)", count = 9, seed = 1 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {Array.from({ length: count }).map((_, i) => {
        const r = (n: number) => {
          const x = Math.sin((i + 1) * 9301 * seed + n * 49297) * 233280;
          return x - Math.floor(x);
        };
        const size = 50 + r(1) * 70;
        const left = r(2) * 100;
        const speed = 0.25 + r(3) * 0.5;
        const top = 110 - ((frame * speed + r(4) * 140) % 140);
        return (
          <PawIcon
            key={i}
            color={color}
            size={size}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: `${top}%`,
              transform: `rotate(${r(5) * 60 - 30 + Math.sin(frame / 30 + i) * 6}deg)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export const PawIcon: React.FC<{
  color: string;
  size: number;
  style?: React.CSSProperties;
}> = ({ color, size, style }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
    <ellipse cx="50" cy="66" rx="22" ry="19" fill={color} />
    <ellipse cx="24" cy="40" rx="9" ry="12" fill={color} />
    <ellipse cx="41" cy="26" rx="9" ry="12" fill={color} />
    <ellipse cx="59" cy="26" rx="9" ry="12" fill={color} />
    <ellipse cx="76" cy="40" rx="9" ry="12" fill={color} />
  </svg>
);

/** Text that rises out of a mask, word by word. */
export const RiseText: React.FC<{
  text: string;
  delay?: number;
  stagger?: number;
  style?: React.CSSProperties;
  lineStyle?: React.CSSProperties;
}> = ({ text, delay = 0, stagger = 3, style, lineStyle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines = text.split("\n");
  let index = 0;
  return (
    <div style={style}>
      {lines.map((line, li) => (
        <div
          key={li}
          style={{
            display: "flex",
            flexWrap: "wrap",
            columnGap: "0.25em",
            ...lineStyle,
          }}
        >
          {line.split(" ").map((word, wi) => {
            const p = spring({
              frame: frame - delay - index++ * stagger,
              fps,
              config: { damping: 16, mass: 0.7 },
            });
            return (
              <span
                key={wi}
                style={{
                  display: "inline-block",
                  overflow: "hidden",
                  paddingBottom: "0.06em",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    transform: `translateY(${(1 - p) * 110}%) rotate(${(1 - p) * 6}deg)`,
                  }}
                >
                  {word}
                </span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export const Kicker: React.FC<{
  children: React.ReactNode;
  delay?: number;
  color?: string;
}> = ({ children, delay = 0, color = c.accent }) => {
  const p = usePop(delay, 18);
  return (
    <div
      style={{
        fontFamily: body,
        fontWeight: 800,
        fontSize: 26,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color,
        opacity: p,
        transform: `translateX(${(1 - p) * -30}px)`,
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <span
        style={{
          width: 36 * p,
          height: 4,
          borderRadius: 2,
          background: color,
          display: "inline-block",
        }}
      />
      {children}
    </div>
  );
};

export const Headline: React.FC<{
  text: string;
  delay?: number;
  size?: number;
  color?: string;
}> = ({ text, delay = 0, size = 120, color = c.strong }) => (
  <RiseText
    text={text}
    delay={delay}
    style={{
      fontFamily: display,
      fontWeight: 900,
      fontSize: size,
      lineHeight: 0.95,
      textTransform: "uppercase",
      color,
    }}
  />
);

export const Chip: React.FC<{
  children: React.ReactNode;
  delay: number;
  dark?: boolean;
  icon?: React.ReactNode;
  size?: number;
}> = ({ children, delay, dark, icon, size = 30 }) => {
  const p = usePop(delay, 13);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        padding: `${size * 0.5}px ${size * 0.95}px`,
        borderRadius: 999,
        fontFamily: body,
        fontWeight: 600,
        fontSize: size,
        color: dark ? c.white : c.strong,
        background: dark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.72)",
        border: dark
          ? "1.5px solid rgba(255,255,255,0.28)"
          : "1.5px solid rgba(255,255,255,0.9)",
        boxShadow: dark
          ? "0 10px 30px rgba(0,0,0,0.18)"
          : "0 12px 30px rgba(29,42,33,0.10)",
        backdropFilter: "blur(14px)",
        opacity: Math.min(1, p * 1.4),
        transform: `translateY(${(1 - p) * 40}px) scale(${0.85 + 0.15 * p})`,
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {children}
    </div>
  );
};

export const Check: React.FC<{ color?: string; size?: number }> = ({
  color = c.action,
  size = 30,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="12" fill={color} />
    <path
      d="M7 12.5l3.2 3.2L17 9"
      stroke="#fff"
      strokeWidth="2.4"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** A desktop browser window showing a website capture. */
export const Browser: React.FC<{
  src: string;
  width: number;
  style?: React.CSSProperties;
  /** 0..1 cross-fade to `next`. */
  next?: string;
  mix?: number;
  zoom?: number;
  /** Height / width of the capture (1440 x 900 by default). */
  aspect?: number;
  /** Frame at which a glare sweeps across the glass. */
  glareAt?: number;
  /** Point the zoom moves toward. */
  origin?: string;
}> = ({
  src,
  width,
  style,
  next,
  mix = 0,
  zoom = 1,
  aspect = 900 / 1440,
  glareAt,
  origin = "50% 30%",
}) => {
  const bar = width * 0.036;
  const shotH = width * aspect;
  return (
    <div
      style={{
        width,
        borderRadius: width * 0.016,
        overflow: "hidden",
        background: "#fbf8f3",
        boxShadow:
          "0 40px 90px rgba(29,42,33,0.28), 0 0 0 1.5px rgba(29,42,33,0.08)",
        ...style,
      }}
    >
      <div
        style={{
          height: bar,
          display: "flex",
          alignItems: "center",
          gap: bar * 0.22,
          padding: `0 ${bar * 0.45}px`,
          background: "#efe6d8",
          borderBottom: "1px solid rgba(29,42,33,0.08)",
        }}
      >
        {["#ff5f57", "#febc2e", "#28c840"].map((col) => (
          <span
            key={col}
            style={{
              width: bar * 0.3,
              height: bar * 0.3,
              borderRadius: "50%",
              background: col,
            }}
          />
        ))}
        <div
          style={{
            margin: "0 auto",
            height: bar * 0.62,
            width: "46%",
            borderRadius: bar,
            background: "rgba(255,255,255,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: bar * 0.15,
            fontFamily: body,
            fontWeight: 500,
            fontSize: bar * 0.34,
            color: c.muted,
          }}
        >
          <svg width={bar * 0.3} height={bar * 0.3} viewBox="0 0 24 24">
            <rect x="5" y="10" width="14" height="11" rx="2" fill={c.muted} />
            <path
              d="M8 10V7a4 4 0 018 0v3"
              stroke={c.muted}
              strokeWidth="2.4"
              fill="none"
            />
          </svg>
          {SITE}
        </div>
        <span style={{ width: bar * 1.2 }} />
      </div>
      <div style={{ position: "relative", height: shotH, overflow: "hidden" }}>
        <Img
          src={staticFile(src)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top",
            transform: `scale(${zoom})`,
            transformOrigin: origin,
          }}
        />
        {next ? (
          <Img
            src={staticFile(next)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "top",
              opacity: mix,
              transform: `scale(${1.04 - 0.04 * mix})`,
            }}
          />
        ) : null}
        {glareAt !== undefined ? <Glare at={glareAt} /> : null}
      </div>
    </div>
  );
};

/** A phone with a screen capture (540 x 1200 captures from the Android app). */
export const Phone: React.FC<{
  src: string;
  height: number;
  style?: React.CSSProperties;
  next?: string;
  mix?: number;
  /** Slide direction for `next`: the new screen pushes in from the right. */
  push?: boolean;
  shadow?: string;
  /** Height / width of the capture (540 x 1200 app captures by default). */
  aspect?: number;
  glareAt?: number;
}> = ({
  src,
  height,
  style,
  next,
  mix = 0,
  push,
  shadow,
  aspect = 1200 / 540,
  glareAt,
}) => {
  const bezel = height * 0.016;
  const screenH = height - bezel * 2;
  const screenW = screenH / aspect;
  const radius = height * 0.06;
  const shot = (s: string, extra: React.CSSProperties) => (
    <Img
      src={staticFile(s)}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        ...extra,
      }}
    />
  );
  return (
    <div
      style={{
        width: screenW + bezel * 2,
        height,
        padding: bezel,
        borderRadius: radius,
        background: "linear-gradient(145deg, #2b2f2c, #0d0f0e 60%, #2a2d2b)",
        boxShadow:
          shadow ??
          "0 50px 100px rgba(16,32,24,0.35), inset 0 0 0 2px rgba(255,255,255,0.12)",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <div
        style={{
          position: "relative",
          width: screenW,
          height: screenH,
          borderRadius: radius - bezel,
          overflow: "hidden",
          background: "#000",
        }}
      >
        {next && push
          ? shot(src, {
              transform: `translateX(${-mix * 30}%)`,
              filter: `brightness(${1 - mix * 0.3})`,
            })
          : shot(src, {})}
        {next
          ? push
            ? shot(next, {
                transform: `translateX(${(1 - mix) * 100}%)`,
                boxShadow: "-20px 0 40px rgba(0,0,0,0.25)",
              })
            : shot(next, { opacity: mix })
          : null}
        {glareAt !== undefined ? <Glare at={glareAt} /> : null}
      </div>
    </div>
  );
};

export const Logo: React.FC<{ size: number; style?: React.CSSProperties }> = ({
  size,
  style,
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: c.white,
      boxShadow: "0 24px 60px rgba(16,32,24,0.25)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      ...style,
    }}
  >
    <Img
      src={staticFile("brand/logo.png")}
      style={{ width: "94%", height: "94%", objectFit: "contain" }}
    />
  </div>
);

/** A fade-in for the first frames of a scene, so cuts never look abrupt. */
export const fadeIn = (frame: number, len = 10) =>
  interpolate(frame, [0, len], [0, 1], clamp);

/* --- visual effects ------------------------------------------------------- */

/** Deterministic pseudo-random number in [0, 1) for particle `i`. */
export const rand = (i: number, n: number, seed = 1) => {
  const x = Math.sin((i + 1) * 12.9898 * seed + n * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** A bright diagonal glare that sweeps across a screen once. */
export const Glare: React.FC<{ at: number; len?: number }> = ({
  at,
  len = 26,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - at, [0, len], [-40, 140], clamp);
  if (frame < at || frame > at + len) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `linear-gradient(115deg, transparent ${p - 18}%, rgba(255,255,255,0.55) ${p}%, transparent ${p + 18}%)`,
        mixBlendMode: "screen",
      }}
    />
  );
};

/** Camera shake that dies away after an impact at frame `at`. */
export const useShake = (at: number, strength = 18, len = 14) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > len) return "translate(0px, 0px)";
  const d = strength * (1 - t / len) ** 2;
  return `translate(${(rand(t, 1, 3) - 0.5) * 2 * d}px, ${(rand(t, 2, 3) - 0.5) * 2 * d}px)`;
};

const Star: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    style={{ display: "block" }}
  >
    <path
      d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z"
      fill={color}
    />
  </svg>
);

const Heart: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    style={{ display: "block" }}
  >
    <path
      d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"
      fill={color}
    />
  </svg>
);

const Coin: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    style={{ display: "block" }}
  >
    <circle
      cx="12"
      cy="12"
      r="11"
      fill="#f2b632"
      stroke="#c8861a"
      strokeWidth="2"
    />
    <circle
      cx="12"
      cy="12"
      r="6.5"
      fill="none"
      stroke="#fbe08a"
      strokeWidth="1.6"
    />
    <ellipse cx="8.5" cy="7.5" rx="2.2" ry="1.3" fill="#fff6d0" opacity="0.8" />
  </svg>
);

/** Twinkling four-point stars scattered over an area. */
export const Sparkles: React.FC<{
  count?: number;
  seed?: number;
  color?: string;
  from?: number;
  area?: [x: number, y: number, w: number, h: number];
  size?: number;
}> = ({
  count = 14,
  seed = 1,
  color = "#fff6d8",
  from = 0,
  area,
  size = 34,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const [ax, ay, aw, ah] = area ?? [0, 0, width, height];
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: count }).map((_, i) => {
        const period = 30 + rand(i, 3, seed) * 40;
        const t = frame - from - rand(i, 4, seed) * period;
        if (t < 0) return null;
        const tw = Math.sin((t / period) * Math.PI) ** 2;
        const s = size * (0.4 + rand(i, 5, seed) * 0.8) * tw;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: ax + rand(i, 1, seed) * aw,
              top: ay + rand(i, 2, seed) * ah,
              transform: `translate(-50%, -50%) rotate(${t * 2}deg)`,
              filter: `drop-shadow(0 0 ${s * 0.4}px ${color})`,
            }}
          >
            <Star size={s} color={color} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export type BurstKind = "paw" | "coin" | "heart" | "star" | "confetti";
const CONFETTI = [
  "#1f6b45",
  "#7dcfa0",
  "#e9a06e",
  "#9e451e",
  "#f2b632",
  "#ffffff",
];

/** Particles thrown out from (x, y) at frame `at`, then falling. */
export const Burst: React.FC<{
  at: number;
  x: number;
  y: number;
  kind?: BurstKind;
  count?: number;
  speed?: number;
  gravity?: number;
  size?: number;
  seed?: number;
  life?: number;
  color?: string;
  /** Spread in degrees around straight up (360 = all directions). */
  spread?: number;
}> = ({
  at,
  x,
  y,
  kind = "star",
  count = 18,
  speed = 26,
  gravity = 1.1,
  size = 44,
  seed = 1,
  life = 45,
  color = "#fff6d8",
  spread = 360,
}) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > life) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "visible" }}>
      {Array.from({ length: count }).map((_, i) => {
        const a = ((-90 + (rand(i, 1, seed) - 0.5) * spread) * Math.PI) / 180;
        const v = speed * (0.45 + rand(i, 2, seed) * 0.75);
        const drag = (1 - Math.exp(-t / 9)) * 9;
        const px = x + Math.cos(a) * v * drag;
        const py = y + Math.sin(a) * v * drag + 0.5 * gravity * t * t * 0.35;
        const fade = interpolate(t, [life * 0.6, life], [1, 0], clamp);
        const pop = interpolate(t, [0, 5], [0.2, 1], clamp);
        const s = size * (0.6 + rand(i, 3, seed) * 0.7);
        const rot = (rand(i, 4, seed) - 0.5) * 40 * t;
        const col =
          kind === "confetti" ? CONFETTI[i % CONFETTI.length]! : color;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: px,
              top: py,
              opacity: fade,
              transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${pop})`,
            }}
          >
            {kind === "paw" ? (
              <PawIcon color={col} size={s} />
            ) : kind === "coin" ? (
              <Coin size={s} />
            ) : kind === "heart" ? (
              <Heart size={s} color={col} />
            ) : kind === "confetti" ? (
              <div
                style={{
                  width: s * 0.5,
                  height: s * 0.28,
                  borderRadius: 3,
                  background: col,
                  transform: `rotateX(${t * 25 + i * 40}deg)`,
                }}
              />
            ) : (
              <Star size={s} color={col} />
            )}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** Slowly turning light rays behind a hero element. */
export const Rays: React.FC<{
  x?: string;
  y?: string;
  color?: string;
  size?: number;
  opacity?: number;
}> = ({
  x = "50%",
  y = "50%",
  color = "rgba(255,255,255,0.5)",
  size = 2600,
  opacity = 1,
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        transform: `translate(-50%, -50%) rotate(${frame * 0.35}deg)`,
        background: `repeating-conic-gradient(${color} 0deg 7deg, transparent 7deg 22deg)`,
        maskImage: "radial-gradient(circle, black 0%, transparent 62%)",
        WebkitMaskImage: "radial-gradient(circle, black 0%, transparent 62%)",
        opacity,
        pointerEvents: "none",
      }}
    />
  );
};

/** A ring that rushes outward from a point at frame `at`. */
export const Shockwave: React.FC<{
  at: number;
  x?: string;
  y?: string;
  color?: string;
  size?: number;
  len?: number;
}> = ({
  at,
  x = "50%",
  y = "50%",
  color = "rgba(255,255,255,0.9)",
  size = 1400,
  len = 24,
}) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > len) return null;
  const p = interpolate(t, [0, len], [0, 1], { ...clamp, easing: easeOut });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size * p,
        height: size * p,
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
        border: `${Math.max(1, 26 * (1 - p))}px solid ${color}`,
        opacity: 1 - p,
        pointerEvents: "none",
      }}
    />
  );
};

/** Film grain over everything (changes every frame). */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.07 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{ pointerEvents: "none", opacity, mixBlendMode: "overlay" }}
    >
      <svg width="100%" height="100%">
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            seed={frame % 12}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

/** A warm light leak that flares across the frame around frame `at`. */
export const LightLeak: React.FC<{
  at: number;
  len?: number;
  flip?: boolean;
}> = ({ at, len = 30, flip }) => {
  const frame = useCurrentFrame();
  const t = frame - (at - len / 2);
  if (t < 0 || t > len) return null;
  const p = t / len;
  const o = Math.sin(p * Math.PI) ** 1.5;
  const x = flip ? 110 - p * 80 : -10 + p * 80;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        mixBlendMode: "screen",
        opacity: o * 0.85,
        background: `radial-gradient(ellipse 55% 75% at ${x}% 40%, rgba(255,170,90,0.85), transparent 70%),
          radial-gradient(ellipse 35% 50% at ${x + 18}% 70%, rgba(255,110,140,0.55), transparent 70%),
          radial-gradient(ellipse 25% 35% at ${x - 10}% 15%, rgba(255,240,180,0.7), transparent 70%)`,
      }}
    />
  );
};

/** Soft dark edges, like a lens. */
export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      background:
        "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 60%, rgba(16,32,24,0.28) 100%)",
    }}
  />
);

/** A drawn cat that peeks up from the bottom edge, blinks and ducks away. */
export const CatPeek: React.FC<{
  at: number;
  x: number;
  size?: number;
  stay?: number;
  color?: string;
  tilt?: number;
  /** Peek from the top edge instead, upside down. */
  bottom?: number;
}> = ({
  at,
  x,
  size = 260,
  stay = 50,
  color = "#2b2f2c",
  tilt = -8,
  bottom = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame - at;
  if (t < 0 || t > stay + 30) return null;
  const up = spring({ frame: t, fps, config: { damping: 11, mass: 0.7 } });
  const down = spring({ frame: t - stay, fps, config: { damping: 18 } });
  const rise = up - down;
  const blink = t % 40 > 33 && t % 40 < 37 ? 0.1 : 1;
  const look = Math.sin(t / 9) * 4;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        bottom: bottom - size * 0.12,
        width: size,
        height: size,
        transform: `translate(-50%, ${(1 - rise) * 105}%) rotate(${tilt * rise}deg)`,
        pointerEvents: "none",
        zIndex: 40,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 100 100">
        <path d="M18 48 L22 12 L42 32 Z" fill={color} />
        <path d="M82 48 L78 12 L58 32 Z" fill={color} />
        <path d="M24 40 L25 22 L36 33 Z" fill="#e9a0a0" />
        <path d="M76 40 L75 22 L64 33 Z" fill="#e9a0a0" />
        <ellipse cx="50" cy="62" rx="38" ry="34" fill={color} />
        {[36, 64].map((cx) => (
          <g key={cx}>
            <ellipse cx={cx} cy="58" rx="8.5" ry={9 * blink} fill="#f4e7a1" />
            <ellipse
              cx={cx + look * 0.5}
              cy="58"
              rx="3.2"
              ry={8 * blink}
              fill="#111"
            />
            <circle cx={cx + 2.5} cy="54.5" r={1.8 * blink} fill="#fff" />
          </g>
        ))}
        <path d="M46 69 L54 69 L50 73 Z" fill="#e9a0a0" />
        <path
          d="M50 73 Q46 78 42 76 M50 73 Q54 78 58 76"
          stroke="#111"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
        {[-1, 1].map((d) => (
          <g
            key={d}
            stroke="rgba(255,255,255,0.65)"
            strokeWidth="1"
            strokeLinecap="round"
          >
            <path d={`M${50 + d * 14} 72 L${50 + d * 38} 68`} />
            <path d={`M${50 + d * 14} 75 L${50 + d * 38} 76`} />
          </g>
        ))}
        <ellipse cx="24" cy="98" rx="10" ry="7" fill={color} />
        <ellipse cx="76" cy="98" rx="10" ry="7" fill={color} />
      </svg>
    </div>
  );
};
