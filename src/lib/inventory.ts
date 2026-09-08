import { queryOptions, type QueryClient } from "@tanstack/react-query";

import type { ProductStatus } from "@/lib/product";

export type Inventory = {
  productId: string;
  stock: number;
  status: ProductStatus;
  updatedAt: string;
};

type InventoryErrorBody = {
  code?: unknown;
  message?: unknown;
};

export class InventoryApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(
      status === 404
        ? "商品が見つかりません。"
        : "在庫情報を取得できませんでした。",
    );
    this.name = "InventoryApiError";
  }
}

export const inventoryQueryKey = (productId: string) =>
  ["product", productId, "inventory"] as const;

export const INVENTORY_STALE_TIME = 30_000;
export const INVENTORY_MAX_RETRIES = 2;

export function shouldRetryInventory(
  failureCount: number,
  error: Error,
): boolean {
  if (failureCount >= INVENTORY_MAX_RETRIES) return false;
  return !(error instanceof InventoryApiError) || error.status >= 500;
}

export function inventoryQueryOptions(productId: string) {
  return queryOptions({
    queryKey: inventoryQueryKey(productId),
    queryFn: () => fetchInventory(productId),
    staleTime: INVENTORY_STALE_TIME,
    retry: shouldRetryInventory,
    retryDelay: 250,
    refetchOnWindowFocus: true,
  });
}

export async function fetchInventory(productId: string): Promise<Inventory> {
  const response = await fetch(
    `/api/products/${encodeURIComponent(productId)}/inventory`,
  );

  if (!response.ok) {
    let body: InventoryErrorBody = {};
    try {
      body = (await response.json()) as InventoryErrorBody;
    } catch {
      // The UI intentionally uses its own safe fallback for malformed responses.
    }

    throw new InventoryApiError(
      response.status,
      typeof body.code === "string" ? body.code : "INVENTORY_FETCH_FAILED",
    );
  }

  return (await response.json()) as Inventory;
}

export function invalidateInventoryQuery(
  queryClient: QueryClient,
  productId: string,
) {
  return queryClient.invalidateQueries({
    queryKey: inventoryQueryKey(productId),
  });
}
