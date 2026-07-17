import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  description,
  badge,
}: {
  label: string;
  value: string | number;
  description?: string;
  badge?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          {badge}
        </div>
        <p className="text-3xl font-semibold tabular-nums">{value}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
