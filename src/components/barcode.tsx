"use client";

import JsBarcode from "jsbarcode";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function Barcode({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        displayValue: true,
        height: 32,
        width: 1.5,
        fontSize: 11,
        margin: 4,
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch {
      // Not every stored barcode is valid CODE128 input — fail silently
      // and just show nothing rather than crash the table row.
    }
  }, [value]);

  // Fixed white background + black lines regardless of theme — admin's
  // always dark (see src/app/admin/layout.tsx), and a transparent barcode
  // with default-black lines would be invisible on a dark card.
  return <svg ref={svgRef} className={cn("rounded-sm", className)} />;
}
