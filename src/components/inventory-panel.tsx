"use client";

import { useQuery } from "@tanstack/react-query";

import { InventoryApiError, inventoryQueryOptions } from "@/lib/inventory";
import { statusLabels } from "@/lib/product";

export function InventoryPanel({ productId }: { productId: string }) {
  const inventory = useQuery(inventoryQueryOptions(productId));

  if (inventory.isPending) {
    return (
      <section
        aria-label="最新の在庫情報"
        aria-busy="true"
        className="mt-8 rounded-2xl border border-slate-200 bg-white p-5"
      >
        <p className="text-sm font-bold text-slate-950">最新の在庫</p>
        <div className="mt-3 h-5 w-36 animate-pulse rounded bg-slate-200" />
        <span className="sr-only">在庫情報を読み込み中です。</span>
      </section>
    );
  }

  if (inventory.isError) {
    const isNotFound =
      inventory.error instanceof InventoryApiError &&
      inventory.error.status === 404;

    return (
      <section
        aria-label="最新の在庫情報"
        role="alert"
        className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-5"
      >
        <p className="text-sm font-bold text-rose-950">
          {isNotFound
            ? "この商品の在庫情報は現在ご利用いただけません。"
            : "在庫情報を取得できませんでした。"}
        </p>
        <p className="mt-2 text-sm leading-6 text-rose-800">
          {isNotFound
            ? "商品が削除された可能性があります。"
            : "通信状況を確認して、もう一度お試しください。"}
        </p>
        <button
          type="button"
          onClick={() => void inventory.refetch()}
          disabled={inventory.isFetching}
          className="mt-4 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-900 disabled:cursor-wait disabled:opacity-60"
        >
          {inventory.isFetching ? "再取得中..." : "もう一度試す"}
        </button>
      </section>
    );
  }

  return (
    <section
      aria-label="最新の在庫情報"
      className="mt-8 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-950">最新の在庫</p>
        {inventory.isFetching && (
          <span className="text-xs text-slate-500">更新中...</span>
        )}
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {inventory.data.stock > 0
          ? `在庫 ${inventory.data.stock}点・${statusLabels[inventory.data.status]}`
          : statusLabels[inventory.data.status]}
      </p>
      <button
        type="button"
        onClick={() => void inventory.refetch()}
        disabled={inventory.isFetching}
        className="mt-3 text-sm font-bold text-violet-700 underline-offset-4 hover:underline disabled:cursor-wait disabled:text-slate-400"
      >
        在庫を更新
      </button>
    </section>
  );
}
