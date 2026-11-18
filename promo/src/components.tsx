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
}> = ({ src, width, style, next, mix = 0, zoom = 1 }) => {
  const bar = width * 0.036;
  const shotH = (width * 900) / 1440;
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
            transformOrigin: "50% 30%",
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
}> = ({ src, height, style, next, mix = 0, push, shadow }) => {
  const bezel = height * 0.016;
  const screenH = height - bezel * 2;
  const screenW = (screenH * 540) / 1200;
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
