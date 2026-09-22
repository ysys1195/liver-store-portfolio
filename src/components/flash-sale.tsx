"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DEMO_PRODUCT_ID,
  DEMO_STORAGE_KEY,
  DemoApiError,
  executeRun,
  fetchDemoState,
  makeRun,
  runSchema,
  summarizeRun,
  type DemoRun,
  type DemoState,
} from "@/lib/flash-sale";
import { invalidateInventoryQuery } from "@/lib/inventory";

const button =
  "cursor-pointer rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-700 disabled:cursor-not-allowed disabled:opacity-40";

export function FlashSale() {
  const client = useQueryClient();
  const [baseline, setBaseline] = useState<DemoState | null>(null);
  const [run, setRun] = useState<DemoRun | null>(null);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const locked = useRef(false);
  // Restore browser-only session storage after SSR, matching Checkout hydration.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(DEMO_STORAGE_KEY);
      if (saved) setRun(runSchema.parse(JSON.parse(saved)));
      sessionStorage.setItem("flash-sale-storage-check", "1");
      sessionStorage.removeItem("flash-sale-storage-check");
    } catch {
      setStorageError(true);
    }
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  const state = useQuery({
    queryKey: ["demo", "state", run?.keys[0] ?? "idle"],
    queryFn: () => fetchDemoState(),
    enabled: false,
    networkMode: "always",
    retry: (count, error) =>
      count < 2 && (!(error instanceof DemoApiError) || error.status >= 500),
    retryDelay: 250,
  });
  function save(next: DemoRun) {
    try {
      sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(next));
    } catch {
      setStorageError(true);
      throw new Error("実行情報を保存できません。新しい注文は送信しません。");
    }
    setRun(next);
  }
  const mutation = useMutation({
    retry: false,
    networkMode: "always",
    mutationFn: async (action: "reset" | "run") => {
      if (action === "reset") {
        setBaseline(null);
        const next = await fetchDemoState(true);
        try {
          sessionStorage.removeItem(DEMO_STORAGE_KEY);
        } catch {
          setStorageError(true);
          throw new Error("実行情報を保存できませんでした。");
        }
        setRun(null);
        setBaseline(next);
      } else {
        const next = run ?? makeRun(baseline!);
        save(next); // Persist every key BEFORE any request can leave the browser.
        const result = await executeRun(next);
        save(result);
      }
      void invalidateInventoryQuery(client, DEMO_PRODUCT_ID);
    },
    onSettled: () => {
      locked.current = false;
    },
  });
  const { refetch } = state;
  // The query key changes when the first run is persisted. Refresh only once
  // the mutation has settled, so it always verifies the completed run's key.
  useEffect(() => {
    if (mutation.isSuccess && mutation.variables === "run") void refetch();
  }, [mutation.isSuccess, mutation.variables, refetch]);
  const busy = mutation.isPending || state.isFetching;
  const final = !busy && !state.isError ? state.data : undefined;
  const summary = run ? summarizeRun(run, final) : null;
  function start(action: "reset" | "run") {
    if (locked.current || busy || storageError || !ready) return;
    locked.current = true;
    mutation.mutate(action);
  }
  return (
    <section
      className="mt-10 space-y-6"
      aria-label="並行注文デモ"
      aria-busy={busy}
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <h2 className="text-xl font-bold text-slate-950">
          夜風ユイ Birthday Goods 2026
        </h2>
        <p className="mt-3 leading-7 text-slate-600">
          初期在庫 5点 / 並行リクエスト 20件 / 10個のキーを各2回使用 / 1注文1点
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          リセットはこの商品の在庫と販売期間だけを初期化します。過去のデモ注文は残ります。他のタブで同じ商品の注文・リセットを行わず、1人ずつ実行してください。
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            className={button}
            disabled={!ready || busy || storageError || !!summary?.unknown}
            onClick={() => start("reset")}
          >
            {mutation.isPending && mutation.variables === "reset"
              ? "リセット中…"
              : "在庫を5にリセット"}
          </button>
          <button
            className={button}
            disabled={!ready || busy || storageError || !baseline || !!run}
            onClick={() => start("run")}
          >
            {mutation.isPending && mutation.variables === "run"
              ? "20件の結果を確認中…"
              : "20件を並行送信"}
          </button>
          {!!summary?.unknown && (
            <button
              className={button}
              disabled={busy || storageError}
              onClick={() => start("run")}
            >
              結果不明の注文を同じキーで再確認
            </button>
          )}
        </div>
        <p role="status" className="mt-4 text-sm text-slate-600">
          {!ready
            ? "保存済み実行情報を確認中…"
            : busy
              ? "処理中です。完了までお待ちください。"
              : baseline && !run
                ? "リセット完了。在庫5点から実行できます。"
                : !run
                  ? "まず在庫をリセットしてください。"
                  : "送信結果を表示しています。再実行する場合はリセットしてください。"}
        </p>
      </div>
      {storageError && (
        <p role="alert" className="rounded-xl bg-red-50 p-5 text-red-800">
          保存情報が破損しているか、sessionStorageを利用できません。安全のため送信を停止しました。保存済みのキーを破棄して再送しないでください。
        </p>
      )}
      {mutation.isError && (
        <p role="alert" className="rounded-xl bg-red-50 p-5 text-red-800">
          {mutation.error instanceof DemoApiError
            ? mutation.error.message
            : "処理を完了できませんでした。通信状態を確認して再試行してください。"}
        </p>
      )}
      {run && summary && (
        <div className="space-y-5">
          <h2 className="text-2xl font-bold text-slate-950">実行結果</h2>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["リクエスト", 20],
              ["新規作成の応答", summary.created],
              ["在庫競合", summary.conflict],
              ["冪等リプレイ / 重複", summary.replayed],
              ["その他エラー", summary.errors],
              ["結果不明", summary.unknown],
              ["ユニーク注文数（応答）", summary.uniqueOrders],
              ["残在庫（DB）", final?.stock ?? "未確認"],
              ["作成注文数（DB差分）", summary.actualOrders ?? "未確認"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <dt className="text-xs leading-5 text-slate-600">{label}</dt>
                <dd className="mt-2 text-3xl font-black text-slate-950">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <div
            className="rounded-2xl border border-slate-200 bg-slate-50 p-6"
            aria-live="polite"
          >
            <h3 className="font-bold text-slate-950">
              整合性検証：
              {summary.consistent === true
                ? "一致"
                : summary.consistent === false
                  ? "不一致"
                  : "未確認"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {summary.consistent === true
                ? `初期在庫5 = 残在庫${final!.stock} + 注文数量${summary.quantity}。DBの作成注文数と応答のユニーク注文数も一致しました。`
                : summary.consistent === false
                  ? "別の操作が混在したか、注文数と在庫に不一致があります。他のタブの操作を止め、DBの結果を確認してください。"
                  : "結果不明の注文がなく、最新のDB状態を取得できた後に検証します。"}
            </p>
            {summary.unknown > 0 && (
              <p className="mt-2 text-sm text-amber-900">
                通信失敗でも注文が完了した可能性があります。リセットせず、同じキーで手動再確認してください。再読み込み後もキーを保持します。
              </p>
            )}
            {summary.errors > 0 && (
              <p className="mt-2 text-sm text-red-800">
                在庫競合以外のエラーが発生しました。設定を確認後にリセットして再試行できます。
              </p>
            )}
            {state.isError && (
              <p role="alert" className="mt-2 text-sm text-red-800">
                最終在庫・注文数を取得できませんでした。古い値で成功判定は行いません。
              </p>
            )}
            <button
              className={`${button} mt-4`}
              disabled={busy}
              onClick={() => void state.refetch()}
            >
              {state.isFetching
                ? "最終在庫を再取得中…"
                : "最終在庫・注文数を再取得"}
            </button>
          </div>
          <p className="text-sm leading-6 text-slate-600">
            重複キーが先に在庫切れになった場合は在庫競合に計上します。再確認の応答は新規作成からリプレイに変わる場合があります。DB差分はリセット時点からの対象商品の注文数です。
          </p>
        </div>
      )}
    </section>
  );
}
