import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  Burst,
  CatPeek,
  Chip,
  clamp,
  easeInOut,
  easeOut,
  Headline,
  Kicker,
  Logo,
  Paws,
  Phone,
  Rays,
  RiseText,
  Shockwave,
  Sparkles,
  usePop,
  useShake,
  useVertical,
  Washes,
} from "./components";
import { body, c, display, SITE } from "./theme";

const pad = (vertical: boolean) => (vertical ? 80 : 120);

/* 1. Logo and name -------------------------------------------------------- */
export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const vertical = useVertical();
  const logo = usePop(4, 11, 0.9);
  const ring = interpolate(frame, [0, 40], [0, 1], {
    ...clamp,
    easing: easeOut,
  });
  const letters = "BREW NI CAT".split("");
  const { fps, width, height } = useVideoConfig();
  const zoomOut = interpolate(frame, [0, 120], [1.06, 1], clamp);
  const shake = useShake(6, 22);
  const logoY = vertical ? "40%" : "33%";
  return (
    <AbsoluteFill style={{ transform: shake }}>
      <Washes />
      <Paws seed={3} />
      <Rays
        y={logoY}
        color="rgba(31,107,69,0.10)"
        opacity={interpolate(frame, [4, 24], [0, 1], clamp)}
      />
      <Shockwave at={6} y={logoY} color="rgba(31,107,69,0.5)" size={1800} />
      <Shockwave at={10} y={logoY} color="rgba(233,160,110,0.6)" size={1300} />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: vertical ? 50 : 34,
          transform: `scale(${zoomOut})`,
        }}
      >
        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              inset: -40 * ring,
              borderRadius: "50%",
              border: `3px solid rgba(31,107,69,${0.35 * (1 - ring) + 0.12})`,
              transform: `scale(${0.6 + ring * 0.4})`,
            }}
          />
          <Logo
            size={vertical ? 300 : 230}
            style={{
              transform: `scale(${logo}) rotate(${(1 - logo) * -120}deg)`,
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: display,
            fontWeight: 900,
            fontSize: vertical ? 170 : 210,
            lineHeight: 0.9,
            color: c.action,
            letterSpacing: "0.01em",
          }}
        >
          {letters.map((l, i) => {
            const p = Math.min(
              1,
              Math.max(
                0,
                interpolate(frame - 18 - i * 2.2, [0, 16], [0, 1], {
                  ...clamp,
                  easing: easeOut,
                }),
              ),
            );
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  width: l === " " ? "0.28em" : undefined,
                  opacity: p,
                  transform: `translateY(${(1 - p) * 80}px) scale(${0.6 + 0.4 * p})`,
                }}
              >
                {l}
              </span>
            );
          })}
        </div>
        <div
          style={{
            fontFamily: body,
            fontWeight: 600,
            fontSize: vertical ? 40 : 36,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: c.muted,
            opacity: interpolate(frame, [45, 65], [0, 1], clamp),
            transform: `translateY(${interpolate(frame, [45, 65], [20, 0], { ...clamp, easing: easeOut })}px)`,
            textAlign: "center",
          }}
        >
          Coffee Shop{vertical ? <br /> : " · "}Kabacan, Cotabato
        </div>
      </AbsoluteFill>
      <Burst
        at={6}
        x={width / 2}
        y={height * (vertical ? 0.4 : 0.33)}
        kind="paw"
        color={c.action}
        count={14}
        speed={40}
        gravity={0.6}
        size={50}
        seed={3}
        life={40}
      />
      <Sparkles seed={5} count={14} from={30} color="#f2c27a" />
      <CatPeek at={56} x={vertical ? 820 : 1620} size={vertical ? 300 : 260} />
      <div style={{ display: "none" }}>{fps}</div>
    </AbsoluteFill>
  );
};

/* 2. Food grid ------------------------------------------------------------ */
const FOOD = [
  "lucky-green-neko-matcha",
  "buldak-carbo",
  "cat-feine-iced-latte",
  "takoyaki-pawsome-balls",
  "dirty-neko-matcha",
  "fries-cat-claws",
  "vanilla-oreo-whisker",
  "caramel-matcha-tail",
  "vanilla-matcha-meow",
];

export const Taste: React.FC = () => {
  const frame = useCurrentFrame();
  const vertical = useVertical();
  const tile = vertical ? 300 : 250;
  const gap = 22;
  const drift = interpolate(frame, [0, 150], [30, -30]);
  return (
    <AbsoluteFill>
      <Washes />
      <AbsoluteFill
        style={{
          flexDirection: vertical ? "column" : "row",
          alignItems: "center",
          justifyContent: "center",
          gap: vertical ? 70 : 90,
          padding: pad(vertical),
        }}
      >
        <div
          style={{
            width: vertical ? "100%" : 760,
            display: "flex",
            flexDirection: "column",
            gap: 28,
          }}
        >
          <Kicker delay={4}>Fresh from the counter</Kicker>
          <Headline
            text={"Coffee, comfort,\nand a little\ncat energy."}
            delay={8}
            size={vertical ? 130 : 128}
          />
          <RiseText
            text="Matcha, iced lattes, buldak, takoyaki, fries and more, made to order."
            delay={30}
            stagger={1.2}
            style={{
              fontFamily: body,
              fontSize: vertical ? 40 : 34,
              color: c.muted,
              lineHeight: 1.4,
              maxWidth: 720,
            }}
          />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(3, ${tile}px)`,
            gap,
            transform: `translateY(${drift}px) rotate(-4deg)`,
          }}
        >
          {FOOD.map((f, i) => {
            const p = usePop(6 + ((i * 4) % 9) * 3, 13);
            const zoom = interpolate(frame, [0, 150], [1.15, 1]);
            return (
              <div
                key={f}
                style={{
                  width: tile,
                  height: tile,
                  borderRadius: 34,
                  overflow: "hidden",
                  boxShadow: "0 24px 50px rgba(29,42,33,0.22)",
                  transform: `scale(${p}) rotate(${(1 - p) * (i % 2 ? 14 : -14)}deg)`,
                  opacity: Math.min(1, p * 2),
                  border: "6px solid #fff",
                }}
              >
                <Img
                  src={staticFile(`menu/${f}.jpg`)}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: `scale(${zoom})`,
                  }}
                />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* 5. App reveal ----------------------------------------------------------- */
export const AppReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const vertical = useVertical();
  const { width, height } = useVideoConfig();
  const phones = [
    { src: "app/redesign-menu-light.png", x: -1, delay: 18 },
    { src: "app/redesign-home-light.png", x: 0, delay: 8 },
    { src: "app/redesign-item-light.png", x: 1, delay: 26 },
  ];
  const ph = vertical ? 1080 : 780;
  const float = Math.sin(frame / 20) * 8;
  const shake = useShake(8, 24, 16);
  const flash = interpolate(frame, [0, 3, 14], [0, 0.55, 0], clamp);
  return (
    <AbsoluteFill style={{ transform: shake }}>
      <Washes dark />
      <Rays
        y={vertical ? "70%" : "75%"}
        color="rgba(125,207,160,0.16)"
        size={3200}
      />
      <Paws color="rgba(255,255,255,0.07)" seed={5} />
      <Shockwave
        at={8}
        y={vertical ? "70%" : "75%"}
        color="rgba(125,207,160,0.8)"
        size={2200}
        len={28}
      />
      <div
        style={{
          position: "absolute",
          top: vertical ? 150 : 70,
          width: "100%",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
        }}
      >
        <Kicker delay={2} color={c.mint}>
          Brand new
        </Kicker>
        <Headline
          text="Now on Android"
          delay={6}
          size={vertical ? 150 : 150}
          color={c.white}
        />
      </div>
      {phones.map((p, i) => {
        const s = usePop(p.delay, 13, 1);
        const spread = vertical ? 330 : 360;
        return (
          <div
            key={p.src}
            style={{
              position: "absolute",
              left: width / 2 + p.x * spread,
              top: height - (vertical ? ph + 160 : ph * 0.82) + (1 - s) * 700,
              transform: `translateX(-50%) rotate(${p.x * 7}deg) translateY(${p.x === 0 ? float : -float}px) scale(${p.x === 0 ? 1.06 : 0.94})`,
              zIndex: p.x === 0 ? 3 : 1,
            }}
          >
            <Phone
              src={p.src}
              height={ph}
              shadow="0 60px 120px rgba(0,0,0,0.45), inset 0 0 0 2px rgba(255,255,255,0.14)"
            />
          </div>
        );
      })}
      <Burst
        at={8}
        x={width / 2}
        y={height * (vertical ? 0.62 : 0.7)}
        kind="star"
        color={c.mint}
        count={24}
        speed={44}
        size={46}
        seed={6}
        life={48}
      />
      <Sparkles seed={8} count={16} from={20} color={c.mint} />
      <AbsoluteFill
        style={{ background: c.white, opacity: flash, pointerEvents: "none" }}
      />
    </AbsoluteFill>
  );
};

/* 6. App features --------------------------------------------------------- */
const FEATURES = [
  {
    title: "Order in a few taps",
    body: "Pick a size, flavor and add-ons. Pay cash or GCash at pickup.",
    src: "app/redesign-item-light.png",
  },
  {
    title: "Track it live",
    body: "See when your order is accepted, being made and ready.",
    src: "app/redesign-order-light.png",
  },
  {
    title: "Earn points & rewards",
    body: "Collect points on completed orders and redeem café treats.",
    src: "app/redesign-rewards-light.png",
  },
  {
    title: "All your orders",
    body: "Check any order again, or reorder your usual in a tap.",
    src: "app/redesign-orders-light.png",
  },
];
export const STEP = 52;

export const AppFeatures: React.FC = () => {
  const frame = useCurrentFrame();
  const vertical = useVertical();
  const step = Math.min(FEATURES.length - 1, Math.floor(frame / STEP));
  const local = frame - step * STEP;
  const mix =
    step < FEATURES.length - 1
      ? interpolate(local, [STEP - 14, STEP], [0, 1], {
          ...clamp,
          easing: easeInOut,
        })
      : 0;
  const enter = usePop(0, 16);
  const cur = FEATURES[step]!;
  const nxt = FEATURES[Math.min(step + 1, FEATURES.length - 1)]!;
  const ph = vertical ? 1040 : 880;
  return (
    <AbsoluteFill>
      <Washes dark />
      <AbsoluteFill
        style={{
          flexDirection: vertical ? "column-reverse" : "row",
          alignItems: "center",
          justifyContent: "center",
          gap: vertical ? 50 : 140,
          padding: pad(vertical),
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: vertical ? 14 : 22,
            width: vertical ? "100%" : 720,
          }}
        >
          {FEATURES.map((f, i) => {
            const active = i === step;
            const shown = interpolate(
              frame,
              [i * 8, i * 8 + 14],
              [0, 1],
              clamp,
            );
            const a = active
              ? interpolate(local, [0, 10], [0.4, 1], clamp)
              : i < step
                ? 0.45
                : 0.3;
            if (vertical && !active) return null;
            return (
              <div
                key={f.title}
                style={{
                  display: "flex",
                  gap: 26,
                  alignItems: "flex-start",
                  padding: "26px 32px",
                  borderRadius: 32,
                  background: active ? "rgba(255,255,255,0.14)" : "transparent",
                  border: active
                    ? "1.5px solid rgba(255,255,255,0.25)"
                    : "1.5px solid transparent",
                  opacity: shown * a + (active ? 0 : 0),
                  transform: `translateX(${(1 - shown) * -60}px) scale(${active ? 1 : 0.96})`,
                  transformOrigin: "left center",
                }}
              >
                <div
                  style={{
                    flex: "none",
                    width: 64,
                    height: 64,
                    borderRadius: 20,
                    background: active ? c.mint : "rgba(255,255,255,0.18)",
                    color: c.actionDeep,
                    fontFamily: display,
                    fontWeight: 900,
                    fontSize: 42,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {i + 1}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: display,
                      fontWeight: 900,
                      fontSize: vertical ? 84 : 64,
                      color: c.white,
                      textTransform: "uppercase",
                      lineHeight: 1,
                    }}
                  >
                    {f.title}
                  </div>
                  {active ? (
                    <div
                      style={{
                        fontFamily: body,
                        fontSize: vertical ? 38 : 28,
                        color: "rgba(255,255,255,0.82)",
                        marginTop: 10,
                        lineHeight: 1.4,
                      }}
                    >
                      {f.body}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        <div
          style={{
            transform: `translateY(${(1 - enter) * 500}px) rotate(${(1 - enter) * 10}deg)`,
          }}
        >
          <Phone
            src={cur.src}
            next={nxt.src}
            mix={mix}
            push
            height={ph}
            glareAt={step * STEP + 8}
            shadow="0 60px 120px rgba(0,0,0,0.45), inset 0 0 0 2px rgba(255,255,255,0.14)"
          />
        </div>
      </AbsoluteFill>
      <Burst
        at={2 * STEP + 8}
        x={vertical ? 540 : 1340}
        y={vertical ? 1100 : 520}
        kind="coin"
        count={22}
        speed={36}
        size={58}
        seed={7}
        life={46}
      />
      <Burst
        at={STEP + 8}
        x={vertical ? 540 : 1340}
        y={vertical ? 1100 : 520}
        kind="star"
        color={c.mint}
        count={12}
        speed={28}
        size={36}
        seed={9}
        life={34}
      />
    </AbsoluteFill>
  );
};

/* 7. Games ---------------------------------------------------------------- */
export const Arcade: React.FC = () => {
  const frame = useCurrentFrame();
  const vertical = useVertical();
  const { width, height } = useVideoConfig();
  const shots = [
    "app/arcade-sheet-light.png",
    "app/arcade-catch-light.png",
    "app/arcade-memory-light.png",
    "app/arcade-simon-dark.png",
  ];
  const ph = vertical ? 700 : 640;
  const spin = interpolate(frame, [0, 150], [-6, 6]);
  return (
    <AbsoluteFill>
      <Washes />
      <Paws seed={11} count={12} color="rgba(233,160,110,0.22)" />
      <div
        style={{
          position: "absolute",
          left: pad(vertical),
          right: pad(vertical),
          top: vertical ? 130 : 90,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          alignItems: vertical ? "flex-start" : "center",
          textAlign: vertical ? "left" : "center",
        }}
      >
        <Kicker delay={2}>While your order brews</Kicker>
        <Headline
          text="Play while you wait"
          delay={6}
          size={vertical ? 140 : 130}
        />
      </div>
      {shots.map((s, i) => {
        const p = usePop(14 + i * 6, 12);
        const n = shots.length;
        const off = i - (n - 1) / 2;
        const spread = vertical ? 200 : 330;
        return (
          <div
            key={s}
            style={{
              position: "absolute",
              left: width / 2 + off * spread,
              top:
                height -
                ph -
                (vertical ? 340 : 140) +
                Math.abs(off) * 40 +
                (1 - p) * 600,
              transform: `translateX(-50%) rotate(${off * 8 + spin * 0.3}deg)`,
              zIndex: 10 - Math.abs(Math.round(off * 2)),
            }}
          >
            <Phone src={s} height={ph} glareAt={30 + i * 8} />
          </div>
        );
      })}
      {[0, 1, 2, 3, 4].map((i) => (
        <Burst
          key={i}
          at={50 + i * 6}
          x={width / 2 + (i - 2) * (vertical ? 180 : 300)}
          y={height - (vertical ? 190 : 80)}
          kind="star"
          color={["#f2b632", "#7dcfa0", "#e9a06e", "#ef7f8f", "#9ad0f5"][i]}
          count={8}
          speed={22}
          size={30}
          seed={20 + i}
          life={30}
          spread={160}
        />
      ))}
      <CatPeek
        at={86}
        x={vertical ? 180 : 210}
        size={vertical ? 260 : 230}
        tilt={10}
        color="#e9e2d6"
      />
      <div
        style={{
          position: "absolute",
          bottom: vertical ? 150 : 40,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          gap: 16,
          flexWrap: "wrap",
          zIndex: 20,
          padding: "0 60px",
          boxSizing: "border-box",
        }}
      >
        <Chip delay={50} size={vertical ? 34 : 28}>
          🐟 Treat Catcher
        </Chip>
        <Chip delay={56} size={vertical ? 34 : 28}>
          🐭 Whack-a-Mouse
        </Chip>
        <Chip delay={62} size={vertical ? 34 : 28}>
          🥤 Cup Stack
        </Chip>
        <Chip delay={68} size={vertical ? 34 : 28}>
          🐾 Paw Says
        </Chip>
        <Chip delay={74} size={vertical ? 34 : 28}>
          🃏 Cat Match
        </Chip>
      </div>
    </AbsoluteFill>
  );
};

/* 8. The cats ------------------------------------------------------------- */
export const Cats: React.FC = () => {
  const frame = useCurrentFrame();
  const vertical = useVertical();
  const { width, height } = useVideoConfig();
  const cats = ["006", "007", "008", "009", "016", "017"];
  const size = vertical ? 400 : 360;
  const layout = vertical
    ? [
        [-0.27, 0.36, -8],
        [0.27, 0.33, 6],
        [-0.25, 0.56, 5],
        [0.26, 0.58, -6],
        [-0.22, 0.79, -4],
        [0.24, 0.8, 7],
      ]
    : [
        [-0.37, 0.36, -9],
        [-0.14, 0.62, 6],
        [0.1, 0.34, -4],
        [0.36, 0.6, 8],
        [-0.38, 0.8, 5],
        [0.37, 0.24, -6],
      ];
  return (
    <AbsoluteFill>
      <Washes />
      {cats.map((n, i) => {
        const p = usePop(4 + i * 5, 12);
        const [lx, ly, r] = layout[i]!;
        const drift = Math.sin(frame / 25 + i) * 6;
        return (
          <div
            key={n}
            style={{
              position: "absolute",
              left: width / 2 + lx! * width,
              top: ly! * height + drift,
              transform: `translate(-50%, -50%) rotate(${r! + (1 - p) * 30}deg) scale(${p})`,
              background: "#fff",
              padding: 14,
              paddingBottom: 40,
              borderRadius: 10,
              boxShadow: "0 30px 60px rgba(29,42,33,0.25)",
            }}
          >
            <Img
              src={staticFile(`shop/cat-${n}.jpg`)}
              style={{
                width: size,
                height: size,
                objectFit: "cover",
                borderRadius: 4,
                display: "block",
              }}
            />
          </div>
        );
      })}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: vertical ? "flex-start" : "center",
          paddingTop: vertical ? 120 : 0,
        }}
      >
        <div
          style={{
            padding: vertical ? "40px 60px" : "44px 70px",
            borderRadius: 40,
            background: "rgba(246,238,225,0.86)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 30px 70px rgba(29,42,33,0.2)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            transform: `scale(${usePop(28, 14)})`,
          }}
        >
          <Kicker delay={30}>Purr-fect company</Kicker>
          <Headline
            text="Meet the café cats"
            delay={34}
            size={vertical ? 96 : 120}
            color={c.action}
          />
        </div>
      </AbsoluteFill>
      <Burst
        at={30}
        x={width / 2}
        y={vertical ? 330 : height / 2}
        kind="heart"
        color="#ef7f8f"
        count={20}
        speed={38}
        gravity={-0.25}
        size={52}
        seed={11}
        life={60}
      />
      <Sparkles seed={13} count={14} from={10} color="#ffe2ec" />
      <CatPeek
        at={40}
        x={vertical ? 230 : 330}
        size={vertical ? 280 : 240}
        tilt={-10}
      />
      <CatPeek
        at={52}
        x={vertical ? 850 : 1600}
        size={vertical ? 240 : 210}
        tilt={8}
        color="#d9a066"
      />
    </AbsoluteFill>
  );
};

/* 9. Call to action ------------------------------------------------------- */
export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const vertical = useVertical();
  const logo = usePop(2, 12);
  const url = usePop(30, 14);
  const shine = interpolate(frame, [40, 80], [-30, 130], clamp);
  const { width, height } = useVideoConfig();
  const shake = useShake(30, 10, 10);
  return (
    <AbsoluteFill style={{ transform: shake }}>
      <Washes dark />
      <Rays color="rgba(255,236,190,0.10)" size={3400} />
      <Paws color="rgba(255,255,255,0.07)" seed={9} />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: vertical ? 50 : 30,
          padding: pad(vertical),
          textAlign: "center",
        }}
      >
        <Logo
          size={vertical ? 240 : 170}
          style={{ transform: `scale(${logo})` }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Headline
            text={
              vertical
                ? "Your next\ncup is\nwaiting."
                : "Your next cup is waiting."
            }
            delay={10}
            size={vertical ? 150 : 130}
            color={c.white}
          />
        </div>
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            padding: vertical ? "30px 54px" : "26px 56px",
            borderRadius: 999,
            background: c.cream,
            color: c.action,
            fontFamily: body,
            fontWeight: 800,
            fontSize: vertical ? 46 : 54,
            boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
            transform: `scale(${url})`,
          }}
        >
          {SITE}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${shine}%`,
              width: "18%",
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)",
              transform: "skewX(-20deg)",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            gap: 18,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Chip dark delay={44} size={vertical ? 34 : 32}>
            Order online for pickup
          </Chip>
          <Chip dark delay={50} size={vertical ? 34 : 32}>
            Free Android app on the website
          </Chip>
        </div>
        <div
          style={{
            fontFamily: body,
            fontWeight: 500,
            fontSize: vertical ? 34 : 28,
            color: "rgba(255,255,255,0.8)",
            opacity: interpolate(frame, [60, 80], [0, 1], clamp),
            lineHeight: 1.5,
          }}
        >
          Abellera St, Poblacion, Kabacan{vertical ? <br /> : " · "}Beside
          Pulido Eatery
        </div>
      </AbsoluteFill>
      <Burst
        at={30}
        x={width / 2}
        y={height * 0.62}
        kind="confetti"
        count={60}
        speed={52}
        gravity={0.9}
        size={56}
        seed={21}
        life={80}
      />
      <Sparkles seed={17} count={18} from={36} color="#fff1c4" />
      <CatPeek
        at={92}
        x={vertical ? 860 : 1640}
        size={vertical ? 300 : 260}
        stay={80}
      />
    </AbsoluteFill>
  );
};
