import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient, ProductCategory } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const livers = [
  {
    id: "liver-yokaze-yui",
    slug: "yokaze-yui",
    name: "夜風ユイ",
    description: "夜更けの時間をテーマに活動する、デモ用の架空ライバーです。",
  },
  {
    id: "liver-asanagi-ren",
    slug: "asanagi-ren",
    name: "朝凪レン",
    description: "コラボ商品の関連確認用に作成する、デモ用の架空ライバーです。",
  },
] as const;

const products = [
  {
    id: "yui-midnight-voice",
    slug: "yui-midnight-voice",
    name: "夜風ユイ Midnight Voice",
    description:
      "ポートフォリオ表示用のデモボイス商品です。実際には購入できません。",
    price: 1000,
    stock: 50,
    category: ProductCategory.VOICE,
    salesStartAt: new Date("2026-09-01T09:00:00.000Z"),
    salesEndAt: null,
  },
  {
    id: "yui-birthday-2026",
    slug: "yui-birthday-2026",
    name: "夜風ユイ Birthday Goods 2026",
    description:
      "Flash Sale Simulation で使用するデモ商品です。実際には購入できません。",
    price: 3000,
    stock: 5,
    category: ProductCategory.GOODS,
    salesStartAt: new Date("2026-09-10T09:00:00.000Z"),
    salesEndAt: new Date("2026-10-10T14:59:59.999Z"),
  },
  {
    id: "yui-ren-midnight-set",
    slug: "yui-ren-midnight-set",
    name: "夜風ユイ＆朝凪レン Midnight Set",
    description:
      "商品とライバーの多対多関連を確認するためのデモコラボ商品です。",
    price: 4500,
    stock: 20,
    category: ProductCategory.SET,
    salesStartAt: new Date("2026-09-15T09:00:00.000Z"),
    salesEndAt: new Date("2026-10-15T14:59:59.999Z"),
  },
] as const;

async function main() {
  for (const liver of livers) {
    await prisma.liver.upsert({
      where: { id: liver.id },
      update: liver,
      create: liver,
    });
  }

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: product,
      create: product,
    });
  }

  const productLivers = [
    { productId: "yui-midnight-voice", liverId: "liver-yokaze-yui" },
    { productId: "yui-birthday-2026", liverId: "liver-yokaze-yui" },
    { productId: "yui-ren-midnight-set", liverId: "liver-yokaze-yui" },
    { productId: "yui-ren-midnight-set", liverId: "liver-asanagi-ren" },
  ];

  for (const productLiver of productLivers) {
    await prisma.productLiver.upsert({
      where: { productId_liverId: productLiver },
      update: {},
      create: productLiver,
    });
  }

  const seededProducts = await prisma.product.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      productLivers: {
        select: {
          liver: { select: { name: true } },
        },
      },
    },
  });

  console.table(
    seededProducts.map((product) => ({
      productId: product.id,
      productName: product.name,
      livers: product.productLivers.map(({ liver }) => liver.name).join(", "),
    })),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
