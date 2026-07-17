import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img src="/logo-mark.png" alt="" className="size-9 shrink-0 object-contain" />
      <span className="text-lg font-bold tracking-tight">
        Leader <span className="text-accent">Sport</span>
      </span>
    </span>
  );
}
