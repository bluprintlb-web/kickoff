"use client";

import JsBarcode from "jsbarcode";
import { useEffect, useRef } from "react";

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
        background: "transparent",
      });
    } catch {
      // Not every stored barcode is valid CODE128 input — fail silently
      // and just show nothing rather than crash the table row.
    }
  }, [value]);

  return <svg ref={svgRef} className={className} />;
}
