import { ImageResponse } from "next/og";

// Shared "LS" mark used everywhere the admin PWA needs a generated icon
// (favicon, apple-touch-icon, manifest icons) — one steel-grey tile, sized
// to spec, with extra padding on the maskable variant so Android's adaptive
// icon crop never clips the glyph. Colors are the "Pale Slate" / "Shadow
// Grey" steps of the Light Steel palette (see globals.css) — kept as plain
// hex here since next/og's ImageResponse can't read CSS custom properties.
export function renderAppIcon(size: number, { maskable = false } = {}) {
  const padding = maskable ? size * 0.2 : size * 0.12;
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
          background: "#adb5bd",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: inner,
            height: inner,
            fontSize: inner * 0.5,
            fontWeight: 700,
            color: "#212529",
            fontFamily: "sans-serif",
          }}
        >
          LS
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
