import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.product.create({
    data: {
      name: "Home Kit Jersey",
      nameAr: "قميص الفريق الأساسي",
      slug: "home-kit-jersey",
      description: "Official replica home jersey.",
      category: "JERSEY",
      ageGroup: "ADULT",
      basePrice: 45,
      images: [],
      variants: {
        create: [
          { sku: "HKJ-S-001", size: "S", color: "Red", stock: 12, barcode: "6291041500213" },
          { sku: "HKJ-M-002", size: "M", color: "Red", stock: 20, barcode: "6291041500220" },
          { sku: "HKJ-L-003", size: "L", color: "Red", stock: 15, barcode: "6291041500237" },
        ],
      },
    },
  });

  await prisma.product.create({
    data: {
      name: "Kids Home Kit Jersey",
      nameAr: "قميص الفريق الأساسي للأطفال",
      slug: "kids-home-kit-jersey",
      description: "Official replica home jersey, kids sizing.",
      category: "JERSEY",
      ageGroup: "KIDS",
      basePrice: 32,
      images: [],
      variants: {
        create: [
          { sku: "KHKJ-22-001", size: "22", color: "Red", stock: 10, barcode: "6291041500244" },
          { sku: "KHKJ-26-002", size: "26", color: "Red", stock: 10, barcode: "6291041500251" },
        ],
      },
    },
  });

  await prisma.product.create({
    data: {
      name: "Match Ball Size 5",
      nameAr: "كرة مباراة مقاس 5",
      slug: "match-ball-size-5",
      description: "Official size 5 match football.",
      category: "BALL",
      basePrice: 28,
      images: [],
      variants: {
        create: [{ sku: "BALL-5-001", stock: 30, barcode: "6291041500268" }],
      },
    },
  });

  await prisma.product.create({
    data: {
      name: "Goalkeeper Gloves",
      nameAr: "قفازات حارس مرمى",
      slug: "goalkeeper-gloves",
      category: "GLOVES",
      basePrice: 22,
      images: [],
      variants: {
        create: [
          { sku: "GK-M-001", size: "M", stock: 8, barcode: "6291041500275" },
          { sku: "GK-L-002", size: "L", stock: 8, barcode: "6291041500282" },
        ],
      },
    },
  });

  await prisma.product.create({
    data: {
      name: "Grip Socks",
      nameAr: "جوارب مانعة للانزلاق",
      slug: "grip-socks",
      category: "SOCKS",
      basePrice: 12,
      images: [],
      variants: {
        create: [
          { sku: "GS-LONG-001", size: "Long", stock: 25, barcode: "6291041500299" },
          { sku: "GS-SHORT-002", size: "Short", stock: 25, barcode: "6291041500305" },
        ],
      },
    },
  });

  console.log("Seeded 5 products.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
