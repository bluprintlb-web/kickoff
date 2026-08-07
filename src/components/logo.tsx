import Image from "next/image";
import { cn } from "@/lib/utils";

// The mark is the real KICKOFF.LB artwork (public/brand/kickoff-icon.png —
// the green Australia/pitch-lines icon, background keyed to transparent),
// not a code-drawn monogram — replaces the earlier "A" tile used during the
// Ayaz rename.
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 transition-transform duration-200 hover:scale-105",
        className
      )}
    >
      <Image
        src="/brand/kickoff-icon.png"
        alt=""
        width={36}
        height={36}
        className="size-9 shrink-0 object-contain"
        priority
      />
      <span className="text-lg font-bold tracking-tight">
        KICK <span className="text-accent">OFF</span>
      </span>
    </span>
  );
}
