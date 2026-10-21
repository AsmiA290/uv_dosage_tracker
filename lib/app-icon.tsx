import { ImageResponse } from "next/og";

// Logo colors: deep teal square, teal shield with a gold outline, gold sun,
// cream diagonal rays. Matches the app's accent (#0F766E) and sun (#FCD34D).
const DEEP = "#134E4A";
const TEAL = "#0F766E";
const GOLD = "#FCD34D";
const CREAM = "#FEF3C7";

const SHIELD =
  "M256 70 C 300 92, 350 100, 392 104 L 392 250 C 392 340, 330 400, 256 438 C 182 400, 120 340, 120 250 L 120 104 C 162 100, 212 92, 256 70 Z";

function rays(r1: number, r2: number, angles: number[], color: string): string {
  return angles
    .map((deg) => {
      const t = (deg * Math.PI) / 180;
      const [x1, y1] = [256 + r1 * Math.cos(t), 252 + r1 * Math.sin(t)];
      const [x2, y2] = [256 + r2 * Math.cos(t), 252 + r2 * Math.sin(t)];
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="22" stroke-linecap="round"/>`;
    })
    .join("");
}

/**
 * The ActinicUVDose logo as SVG: a shield with the sun inside, for the
 * Actinic Shield. The mark is scaled to 82% so it stays inside the
 * "maskable" safe zone when a phone crops the icon to a circle.
 */
export function logoSvg(): string {
  const mark =
    `<path d="${SHIELD}" fill="${TEAL}" stroke="${GOLD}" stroke-width="26" stroke-linejoin="round"/>` +
    rays(74, 104, [0, 90, 180, 270], GOLD) +
    rays(74, 98, [45, 135, 225, 315], CREAM) +
    `<circle cx="256" cy="252" r="50" fill="${GOLD}"/>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">` +
    `<rect width="512" height="512" fill="${DEEP}"/>` +
    `<g transform="translate(256 256) scale(0.82) translate(-256 -256)">${mark}</g>` +
    `</svg>`
  );
}

/** App icon rendered as a PNG at build time, generated in code instead of committed as binary files. */
export function renderAppIcon(size: number): ImageResponse {
  const src = `data:image/svg+xml;base64,${Buffer.from(logoSvg()).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: DEEP }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={size} height={size} alt="" />
      </div>
    ),
    { width: size, height: size }
  );
}
