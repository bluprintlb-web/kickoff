import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

const WHATSAPP_NUMBER = "96181962691";
const WHATSAPP_MESSAGE = "Hi, I wanna place an order.";

// lucide-react dropped brand/logo icons a while back (trademarked marks
// that change often), so these are hand-included — same stroke-based 24x24
// style as every lucide icon elsewhere in the app, sized/colored via the
// same `className` convention (currentColor + size-*).
export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.5" y2="6.5" />
    </svg>
  );
}

export function TiktokIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 7.917v4.034a9.948 9.948 0 0 1 -5 -1.951v6.5a6.5 6.5 0 1 1 -8 -6.326v4.326a2.5 2.5 0 1 0 4 2v-11.5h4.083a6.005 6.005 0 0 0 4.917 4.917z" />
    </svg>
  );
}

export function WhatsappIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Chat-bubble-with-tail outline — WhatsApp's distinguishing shape. */}
      <path d="M12 2a10 10 0 0 0 -8.6 15.1L2 22l4.9 -1.4A10 10 0 1 0 12 2z" />
      {/* A real phone-handset icon nested as a sub-viewport (rather than a
          hand-guessed WhatsApp-specific squiggle) scaled/positioned inside
          the bubble — lucide's own "Phone" glyph, since inheriting
          stroke/fill from the parent <svg> works the same way CSS
          presentation attributes always inherit down the DOM. */}
      <svg x="6.3" y="6.3" width="11.4" height="11.4" viewBox="0 0 24 24">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    </svg>
  );
}

const SOCIAL_LINKS = [
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@kickoff_.lb",
    icon: TiktokIcon,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/kickoff_lb",
    icon: InstagramIcon,
  },
  {
    label: "WhatsApp",
    href: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`,
    icon: WhatsappIcon,
  },
] as const;

export function SocialLinks({
  className,
  iconClassName,
  label,
  // Wraps each icon in a bordered circular button instead of a plain inline
  // link — for the header, next to the cart icon.
  variant = "plain",
  // Renders the same icons as plain, non-interactive spans instead of real
  // links — for a same-width layout spacer (see the promo bar), so it
  // doesn't leave invisible-but-focusable duplicate links in the tab order.
  decorative = false,
}: {
  className?: string;
  iconClassName?: string;
  label?: string;
  variant?: "plain" | "circle";
  decorative?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)} aria-hidden={decorative}>
      {label && <span className="sr-only">{label}</span>}
      {SOCIAL_LINKS.map(({ label: iconLabel, href, icon: Icon }) =>
        decorative ? (
          <span key={iconLabel}>
            <Icon className={cn("size-4", iconClassName)} />
          </span>
        ) : (
          <a
            key={iconLabel}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={iconLabel}
            className={cn(
              "inline-flex transition-all duration-200 hover:scale-110 hover:text-accent",
              variant === "circle" &&
                "size-7 items-center justify-center rounded-full border border-current/25 hover:border-accent"
            )}
          >
            <Icon className={cn("size-4", iconClassName)} />
          </a>
        )
      )}
    </div>
  );
}
