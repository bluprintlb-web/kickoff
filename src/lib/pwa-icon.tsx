import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// The real KICKOFF.LB icon (public/brand/kickoff-icon.png, transparent
// background) read once at module load and inlined as a data URI — next/og's
// ImageResponse can't reference /public paths directly, only actual image
// data. Background is pure black to match the logo's own backdrop (also the
// --surface-brand token — kept as a plain hex here since ImageResponse can't
// read CSS custom properties). Replaces the earlier deep-purple "A" tile
// used during the Ayaz rename.
const ICON_DATA_URI = `data:image/png;base64,${readFileSync(
  join(process.cwd(), "public/brand/kickoff-icon.png")
).toString("base64")}`;

export function renderAppIcon(size: number, { maskable = false } = {}) {
  const padding = maskable ? size * 0.24 : size * 0.14;
  const inner = size - padding * 2;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ICON_DATA_URI}
          width={inner}
          height={inner}
          alt=""
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    { width: size, height: size }
  );
}
