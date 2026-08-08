import { renderAppIcon } from "@/lib/pwa-icon";

export function GET() {
  return renderAppIcon(512, { maskable: true });
}
