import { connection } from "next/server";
import { FlashSale } from "@/components/flash-sale";
import { DisclaimerModal } from "@/components/disclaimer-modal";
import { isDemoEnabled } from "@/lib/server/flash-sale";
export default async function FlashSalePage() {
  await connection();
  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-20">
      <DisclaimerModal />
      <p className="text-xs font-bold tracking-widest text-violet-700">
        UNOFFICIAL PORTFOLIO DEMO
      </p>
      <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-5xl">
        Flash Sale Simulation
      </h1>
      <p className="mt-5 max-w-2xl leading-7 text-slate-600">
        在庫5点に20件のデモ注文を同時送信し、在庫競合と二重注文の防止を確認します。実際の注文・決済は発生しません。
      </p>
      {isDemoEnabled() ? (
        <FlashSale />
      ) : (
        <p className="mt-8 rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950">
          このデモはローカル専用です。本番・Previewでは実行できません。開発環境で専用DBと
          ENABLE_FLASH_SALE_DEMO を設定してください。手順はリポジトリの
          docs/flash-sale-design.md に記載しています。
        </p>
      )}
    </main>
  );
}
