"use client";

import {
  onlineManager,
  useMutation,
  useQueries,
  useQueryClient,
} from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  inventoryQueryOptions,
  invalidateInventoryQuery,
} from "@/lib/inventory";
import {
  OrderError,
  OrderTimeoutError,
  orderRequestSchema,
  orderResultSchema,
  postOrder,
  type OrderRequest,
  type OrderResult,
} from "@/lib/orders";
import { formatPrice, statusLabels } from "@/lib/product";
import { useCartStore } from "@/stores/cart-store";
import { useCartHydration } from "@/stores/use-cart-hydration";

const subscribeOnline = (onChange: () => void) => {
  const unsubscribe = onlineManager.subscribe(onChange);
  // Also observe reconnect after the page was initially loaded offline.
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    unsubscribe();
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};
const getOnlineSnapshot = () => onlineManager.isOnline() && navigator.onLine;
const getServerOnlineSnapshot = () => true;

const STORAGE_KEY = "liver-store-order-attempt";
type Attempt = { request: OrderRequest; result?: OrderResult };
export function CheckoutContent() {
  const hydrated = useCartHydration();
  const online = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getServerOnlineSnapshot,
  );
  const items = useCartStore((s) => s.items);
  const [blocked, setBlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [message, setMessage] = useState("");
  const sending = useRef(false);
  const client = useQueryClient();
  const productIds =
    attempt?.request.items.map((i) => i.productId) ?? items.map((i) => i.id);
  const inventories = useQueries({
    queries: productIds.map(inventoryQueryOptions),
  });
  /* Hydrate browser-only session storage after SSR; one intentional synchronization render. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        setAttempt({
          request: orderRequestSchema.parse(saved.request),
          result: saved.result
            ? orderResultSchema.parse(saved.result)
            : undefined,
        });
      }
    } catch {
      setBlocked(true);
      setMessage(
        "保存した注文情報を復元できません。注文済みか不明な場合は再注文しないでください。",
      );
    }
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  const mutation = useMutation({
    mutationFn: postOrder,
    retry: false,
    // Do not queue an offline order for automatic submission on reconnect.
    networkMode: "always",
    onSuccess: (result, request) => {
      const completed = { request, result };
      setAttempt(completed);
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
      } catch {
        /* The pending request still has the same key. */
      }
      // Do not discard products added or changed in another view while pending.
      useCartStore.setState((state) => ({
        items: state.items.filter(
          (item) =>
            !request.items.some(
              (ordered) =>
                ordered.productId === item.id &&
                ordered.quantity === item.quantity,
            ),
        ),
      }));
      void Promise.all(
        productIds.map((id) => invalidateInventoryQuery(client, id)),
      );
    },
    onError: (error) => {
      setMessage(
        error instanceof OrderError || error instanceof OrderTimeoutError
          ? error.message
          : "注文結果を確認できませんでした。同じ内容・キーで再確認してください。",
      );
      if (error instanceof OrderError && error.status === 409) {
        void Promise.all(
          productIds.map((id) => invalidateInventoryQuery(client, id)),
        );
      }
      // Only a definitive rejection allows editing and a new logical attempt.
      if (
        error instanceof OrderError &&
        [400, 404, 409].includes(error.status) &&
        error.code !== "IDEMPOTENCY_KEY_CONFLICT"
      ) {
        try {
          sessionStorage.removeItem(STORAGE_KEY);
          setAttempt(null);
        } catch {
          /* Keep the key if storage cannot be updated. */
        }
      }
    },
  });
  const offlineRetry = !online && attempt !== null;
  const submitDisabled =
    blocked || mutation.isPending || productIds.length === 0 || offlineRetry;
  async function submit() {
    if (
      sending.current ||
      submitDisabled ||
      !ready ||
      !hydrated ||
      productIds.length === 0 ||
      attempt?.result
    )
      return;
    sending.current = true;
    setMessage("");
    try {
      const next = attempt ?? {
        request: {
          idempotencyKey: crypto.randomUUID(),
          items: items.map((i) => ({ productId: i.id, quantity: i.quantity })),
        },
      };
      // Persist before sending: reload and uncertain network outcomes must reuse the key.
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setAttempt(next);
      await mutation.mutateAsync(next.request).catch(() => {});
    } catch {
      setMessage(
        "注文キーを保存できないため送信していません。ブラウザの保存設定を確認してください。",
      );
    } finally {
      sending.current = false;
    }
  }
  if (!hydrated || !ready)
    return <p role="status">カートを読み込んでいます…</p>;
  if (attempt?.result)
    return (
      <div role="status" className="mt-6 space-y-3">
        <h2 className="text-xl font-bold">デモ注文が完了しました</h2>
        <p>注文番号：{attempt.result.orderId}</p>
        <p>確定金額：{formatPrice(attempt.result.totalAmount)}</p>
        <button
          className="underline"
          onClick={() => {
            try {
              sessionStorage.removeItem(STORAGE_KEY);
              setAttempt(null);
            } catch {
              setMessage("保存設定を確認してください。");
            }
          }}
        >
          別のデモ注文を始める
        </button>
      </div>
    );
  return (
    <div className="mt-6 space-y-5 text-left">
      <p>
        非公式・非商用デモです。デモ用の注文記録と在庫更新のみを行い、実際の注文・決済は行われません。金額はサーバーの商品価格で確定します。
      </p>
      <ul className="space-y-2">
        {productIds.map((id, index) => (
          <li key={id}>
            {items.find((i) => i.id === id)?.name ?? id}：
            {attempt?.request.items.find((i) => i.productId === id)?.quantity ??
              items.find((i) => i.id === id)?.quantity}
            点<br />
            {inventories[index]?.isError ? (
              <button
                className="underline"
                onClick={() => void inventories[index].refetch()}
              >
                在庫取得失敗・再取得
              </button>
            ) : inventories[index]?.data ? (
              `最新在庫 ${inventories[index].data.stock}点（${statusLabels[inventories[index].data.status]}）`
            ) : (
              "在庫を確認中…"
            )}
          </li>
        ))}
      </ul>
      {message && (
        <p role="alert" className="text-red-700">
          {message}
        </p>
      )}
      {productIds.length === 0 && <p>カートは空です。</p>}
      {offlineRetry && (
        <p id="offline-order-notice" role="status">
          オフラインです。オンラインに戻ると、同じ注文キーで結果を再確認できます。
        </p>
      )}
      <div className={submitDisabled ? "cursor-not-allowed" : undefined}>
        <button
          type="button"
          aria-describedby={offlineRetry ? "offline-order-notice" : undefined}
          disabled={submitDisabled}
          onClick={() => void submit()}
          className="w-full cursor-pointer rounded-xl bg-slate-950 px-5 py-3 font-bold text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-700 enabled:hover:bg-violet-800 disabled:pointer-events-none disabled:opacity-50"
        >
          {mutation.isPending
            ? "注文を確認中…"
            : attempt
              ? "同じ注文キーで結果を再確認"
              : "デモ注文を確定する"}
        </button>
      </div>
      {!mutation.isPending && !attempt && (
        <Link className="inline-block underline" href="/cart">
          カートに戻って数量を変更
        </Link>
      )}
    </div>
  );
}
