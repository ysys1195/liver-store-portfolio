import { NextResponse } from "next/server";

import {
  getProductInventory,
  InventoryProductNotFoundError,
} from "@/lib/server/inventory";

type InventoryRouteContext = {
  params: Promise<{ productId: string }>;
};

export async function GET(_request: Request, context: InventoryRouteContext) {
  const { productId } = await context.params;

  try {
    const inventory = await getProductInventory(productId);
    return NextResponse.json(inventory, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof InventoryProductNotFoundError) {
      return NextResponse.json(
        {
          code: "PRODUCT_NOT_FOUND",
          message: "商品が見つかりません。",
        },
        { status: 404 },
      );
    }

    console.error("Failed to load product inventory", error);
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message:
          "在庫情報を取得できませんでした。時間をおいて再度お試しください。",
      },
      { status: 500 },
    );
  }
}
