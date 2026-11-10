import type { ShopCat } from "@/lib/cats/cats";

/**
 * One of the shop's cats seen from the side, facing right. While `walking`,
 * the legs swing in a walk cycle (CSS in globals.css); otherwise the cat sits.
 */
export function CatFigure({
  cat,
  walking,
}: Readonly<{ cat: ShopCat; walking: boolean }>) {
  const stroke = "rgba(40, 30, 24, 0.55)";
  const tailWidth = cat.longFur ? 9 : 6;
  return (
    <svg
      viewBox="0 0 120 80"
      width="84"
      height="56"
      className={walking ? "cat-figure cat-figure--walking" : "cat-figure"}
      data-cat={cat.name}
      focusable="false"
    >
      {/* tail */}
      <path
        className="cat-tail"
        d={walking ? "M22 40 C8 34 6 18 14 10" : "M24 62 C8 66 6 76 30 74"}
        fill="none"
        stroke={cat.points}
        strokeWidth={tailWidth}
        strokeLinecap="round"
      />
      {walking ? (
        <>
          {/* legs: back pair and front pair swing in turn */}
          <g
            className="cat-leg cat-leg--a"
            style={{ transformOrigin: "34px 48px" }}
          >
            <rect
              x="30"
              y="46"
              width="8"
              height="24"
              rx="4"
              fill={cat.fur}
              stroke={stroke}
            />
            <rect
              x="29"
              y="64"
              width="10"
              height="7"
              rx="3.5"
              fill={cat.points}
            />
          </g>
          <g
            className="cat-leg cat-leg--b"
            style={{ transformOrigin: "44px 48px" }}
          >
            <rect
              x="40"
              y="46"
              width="8"
              height="24"
              rx="4"
              fill={cat.fur}
              stroke={stroke}
            />
            <rect
              x="39"
              y="64"
              width="10"
              height="7"
              rx="3.5"
              fill={cat.points}
            />
          </g>
          <g
            className="cat-leg cat-leg--b"
            style={{ transformOrigin: "74px 48px" }}
          >
            <rect
              x="70"
              y="46"
              width="8"
              height="24"
              rx="4"
              fill={cat.fur}
              stroke={stroke}
            />
            <rect
              x="69"
              y="64"
              width="10"
              height="7"
              rx="3.5"
              fill={cat.points}
            />
          </g>
          <g
            className="cat-leg cat-leg--a"
            style={{ transformOrigin: "84px 48px" }}
          >
            <rect
              x="80"
              y="46"
              width="8"
              height="24"
              rx="4"
              fill={cat.fur}
              stroke={stroke}
            />
            <rect
              x="79"
              y="64"
              width="10"
              height="7"
              rx="3.5"
              fill={cat.points}
            />
          </g>
          {/* body */}
          <ellipse
            cx="58"
            cy="42"
            rx="36"
            ry={cat.longFur ? 16 : 14}
            fill={cat.fur}
            stroke={stroke}
          />
        </>
      ) : (
        <>
          {/* sitting body and front paws */}
          <ellipse
            cx="54"
            cy="56"
            rx="26"
            ry="20"
            fill={cat.fur}
            stroke={stroke}
          />
          <rect
            x="66"
            y="58"
            width="9"
            height="16"
            rx="4.5"
            fill={cat.fur}
            stroke={stroke}
          />
          <rect x="65" y="69" width="11" height="6" rx="3" fill={cat.points} />
        </>
      )}
      {/* head */}
      <g transform={walking ? "translate(0 0)" : "translate(-14 14)"}>
        <path d="M86 18 L90 2 L99 15 Z" fill={cat.points} stroke={stroke} />
        <path d="M103 15 L111 3 L112 20 Z" fill={cat.points} stroke={stroke} />
        <path d="M89 8 L90 2 L94 9 Z" fill={cat.earTips} />
        <path d="M108 7 L111 3 L111.5 10 Z" fill={cat.earTips} />
        <circle cx="99" cy="27" r="15" fill={cat.fur} stroke={stroke} />
        {cat.points !== cat.fur ? (
          <ellipse
            cx="104"
            cy="31"
            rx="9"
            ry="8"
            fill={cat.points}
            opacity="0.85"
          />
        ) : null}
        <ellipse cx="104" cy="24" rx="3" ry="3.6" fill={cat.eyes} />
        <ellipse cx="104.6" cy="24" rx="1.1" ry="2.8" fill="#1d1712" />
        <path d="M112 30 l2.5 1.5 -2.5 1.5 Z" fill="#c9837c" />
        {cat.collar ? (
          <path
            d="M88 38 Q98 45 108 39"
            fill="none"
            stroke={cat.collar}
            strokeWidth="4"
            strokeLinecap="round"
          />
        ) : null}
      </g>
    </svg>
  );
}
