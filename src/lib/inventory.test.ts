import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import {
  INVENTORY_MAX_RETRIES,
  INVENTORY_STALE_TIME,
  invalidateInventoryQuery,
  inventoryQueryKey,
  inventoryQueryOptions,
  InventoryApiError,
  shouldRetryInventory,
} from "./inventory";

describe("inventory query policy", () => {
  it("商品単位の安定したquery keyとstale/refocus設定を提供する", () => {
    const options = inventoryQueryOptions("product-1");

    expect(options.queryKey).toEqual(["product", "product-1", "inventory"]);
    expect(options.staleTime).toBe(INVENTORY_STALE_TIME);
    expect(options.refetchOnWindowFocus).toBe(true);
  });

  it("404は再試行せず、通信・サーバーエラーは上限まで再試行する", () => {
    expect(
      shouldRetryInventory(0, new InventoryApiError(404, "NOT_FOUND")),
    ).toBe(false);
    expect(
      shouldRetryInventory(0, new InventoryApiError(500, "INTERNAL")),
    ).toBe(true);
    expect(shouldRetryInventory(0, new TypeError("network error"))).toBe(true);
    expect(
      shouldRetryInventory(
        INVENTORY_MAX_RETRIES,
        new InventoryApiError(500, "INTERNAL"),
      ),
    ).toBe(false);
  });

  it("後続の注文処理から商品単位でinvalidateできる", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(inventoryQueryKey("product-1"), { stock: 1 });
    queryClient.setQueryData(inventoryQueryKey("product-2"), { stock: 2 });

    await invalidateInventoryQuery(queryClient, "product-1");

    expect(
      queryClient.getQueryState(inventoryQueryKey("product-1"))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(inventoryQueryKey("product-2"))?.isInvalidated,
    ).toBe(false);
  });
});
