import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CART_STORAGE_KEY,
  getCartItemCount,
  getCartSubtotal,
  type CartProduct,
  useCartStore,
} from "./cart-store";

const product: CartProduct = {
  id: "voice-1",
  slug: "demo-voice",
  name: "Demo Voice",
  price: 1_000,
  maxStock: 2,
  category: "VOICE",
  imageUrl: null,
};

describe("cart store", () => {
  beforeEach(() => {
    localStorage.clear();
    useCartStore.setState({
      items: [],
      hasHydrated: false,
      soldOutRemovalNames: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("商品追加と数量更新を在庫上限内に制限する", () => {
    const { addItem } = useCartStore.getState();

    addItem(product);
    addItem(product, 10);

    expect(useCartStore.getState().items).toEqual([
      { ...product, quantity: 2 },
    ]);

    useCartStore.getState().updateQuantity(product.id, 99);
    expect(useCartStore.getState().items[0]?.quantity).toBe(2);

    useCartStore.getState().updateQuantity(product.id, 0);
    expect(useCartStore.getState().items[0]?.quantity).toBe(1);
  });

  it("削除、小計、商品点数を処理する", () => {
    useCartStore.getState().addItem(product, 2);
    useCartStore.getState().addItem(
      {
        ...product,
        id: "goods-1",
        slug: "demo-goods",
        name: "Demo Goods",
        price: 1_500,
        maxStock: 3,
        category: "GOODS",
      },
      1,
    );

    expect(getCartSubtotal(useCartStore.getState().items)).toBe(3_500);
    expect(getCartItemCount(useCartStore.getState().items)).toBe(3);

    useCartStore.getState().removeItem(product.id);
    expect(useCartStore.getState().items.map((item) => item.id)).toEqual([
      "goods-1",
    ]);
  });

  it("在庫切れの商品だけを削除し、削除した商品名を保持する", () => {
    const availableProduct = {
      ...product,
      id: "goods-1",
      name: "Demo Goods",
    };
    useCartStore.getState().addItem(product);
    useCartStore.getState().addItem(availableProduct);

    useCartStore
      .getState()
      .removeSoldOutItems([{ id: product.id, name: product.name }]);

    expect(useCartStore.getState().items).toEqual([
      { ...availableProduct, quantity: 1 },
    ]);
    expect(useCartStore.getState().soldOutRemovalNames).toEqual(["Demo Voice"]);
  });

  it("追加した商品をlocalStorageへ保存し、再読み込み相当で復元する", async () => {
    useCartStore.getState().addItem(product, 2);
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);

    expect(savedCart).toContain('"quantity":2');

    useCartStore.setState({ items: [], hasHydrated: false });
    localStorage.setItem(CART_STORAGE_KEY, savedCart ?? "");
    await useCartStore.persist.rehydrate();

    expect(useCartStore.getState().items).toEqual([
      { ...product, quantity: 2 },
    ]);
  });

  it("localStorageから復元し、不正データと在庫超過数量を補正する", async () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        state: {
          items: [
            { ...product, quantity: 20 },
            { id: "invalid", quantity: 1 },
          ],
        },
        version: 0,
      }),
    );

    await useCartStore.persist.rehydrate();

    expect(useCartStore.getState().hasHydrated).toBe(true);
    expect(useCartStore.getState().items).toEqual([
      { ...product, quantity: 2 },
    ]);
  });

  it("localStorageが利用できなくてもメモリ上のカートを操作できる", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage blocked", "SecurityError");
    });

    await expect(useCartStore.persist.rehydrate()).resolves.toBeUndefined();
    expect(useCartStore.getState().hasHydrated).toBe(true);
    expect(() => useCartStore.getState().addItem(product)).not.toThrow();
    expect(useCartStore.getState().items).toEqual([
      { ...product, quantity: 1 },
    ]);
  });
});
