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
    imageUrl: "/images/yokaze-yui-bust.png",
  },
  {
    id: "liver-namiro",
    slug: "namiro",
    name: "ナミロ",
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
    imageUrl: "/images/yokaze-yui-voice.png",
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
    imageUrl: "/images/yokaze-yui-birthday-goods.png",
    salesStartAt: new Date("2026-09-10T09:00:00.000Z"),
    salesEndAt: new Date("2026-10-10T14:59:59.999Z"),
  },
  {
    id: "yui-namiro-midnight-set",
    slug: "yui-namiro-midnight-set",
    name: "夜風ユイ＆ナミロ Midnight Set",
    description:
      "商品とライバーの多対多関連を確認するためのデモコラボ商品です。",
    price: 4500,
    stock: 20,
    category: ProductCategory.SET,
    imageUrl: "/images/yokaze-yui-midnight-set.png",
    salesStartAt: new Date("2026-09-15T09:00:00.000Z"),
    salesEndAt: new Date("2026-10-15T14:59:59.999Z"),
  },
  {
    id: "yui-moonlight-acrylic-stand",
    slug: "yui-moonlight-acrylic-stand",
    name: "夜風ユイ Moonlight Acrylic Stand",
    description:
      "残りわずかの販売状態を確認するためのデモグッズです。実際には購入できません。",
    price: 1800,
    stock: 3,
    category: ProductCategory.GOODS,
    imageUrl: "/images/yokaze-yui-acrylic-stand.png",
    salesStartAt: new Date("2026-09-01T09:00:00.000Z"),
    salesEndAt: null,
  },
  {
    id: "yui-starlight-keychain",
    slug: "yui-starlight-keychain",
    name: "夜風ユイ Starlight Keychain",
    description:
      "SOLD OUT表示を確認するためのデモグッズです。実際には購入できません。",
    price: 1200,
    stock: 0,
    category: ProductCategory.GOODS,
    imageUrl: "/images/yokaze-yui-keychain.png",
    salesStartAt: new Date("2026-08-01T09:00:00.000Z"),
    salesEndAt: null,
  },
  {
    id: "yui-summer-night-voice",
    slug: "yui-summer-night-voice",
    name: "夜風ユイ Summer Night Voice",
    description:
      "販売終了表示を確認するためのデモボイス商品です。実際には購入できません。",
    price: 800,
    stock: 12,
    category: ProductCategory.VOICE,
    imageUrl: "/images/yokaze-yui-voice-summer-night.png",
    salesStartAt: new Date("2026-07-01T09:00:00.000Z"),
    salesEndAt: new Date("2026-08-31T14:59:59.999Z"),
  },
  {
    id: "yui-next-century-voice",
    slug: "yui-next-century-voice",
    name: "夜風ユイ Next Century Voice",
    description:
      "COMING SOON表示を長期間確認できるようにするためのデモボイス商品です。実際には購入できません。",
    price: 1500,
    stock: 25,
    category: ProductCategory.VOICE,
    imageUrl: "/images/yokaze-yui-voice-next-century.png",
    salesStartAt: new Date("2099-01-01T09:00:00.000Z"),
    salesEndAt: null,
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
    { productId: "yui-namiro-midnight-set", liverId: "liver-yokaze-yui" },
    { productId: "yui-namiro-midnight-set", liverId: "liver-namiro" },
    {
      productId: "yui-moonlight-acrylic-stand",
      liverId: "liver-yokaze-yui",
    },
    { productId: "yui-starlight-keychain", liverId: "liver-yokaze-yui" },
    { productId: "yui-summer-night-voice", liverId: "liver-yokaze-yui" },
    { productId: "yui-next-century-voice", liverId: "liver-yokaze-yui" },
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
