import {
  Footprints,
  Hand,
  PersonStanding,
  Shield,
  Shirt,
  Trophy,
  Volleyball,
  type LucideIcon,
} from "lucide-react";
import type { ProductCategoryValue } from "@/lib/product-category";

export const CATEGORY_ICONS: Record<ProductCategoryValue, LucideIcon> = {
  JERSEY: Shirt,
  TROPHY: Trophy,
  BALL: Volleyball,
  GLOVES: Hand,
  BODYWEAR: PersonStanding,
  SHIN_PADS: Shield,
  SOCKS: Footprints,
};
