"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

export const DISCLAIMER_STORAGE_KEY = "liver-store-disclaimer-accepted";
const DISCLAIMER_ACCEPTED_EVENT = "liver-store-disclaimer-accepted";

function subscribeToAcceptance(onStoreChange: () => void) {
  window.addEventListener(DISCLAIMER_ACCEPTED_EVENT, onStoreChange);
  return () =>
    window.removeEventListener(DISCLAIMER_ACCEPTED_EVENT, onStoreChange);
}

function getStoredAcceptance() {
  try {
    return sessionStorage.getItem(DISCLAIMER_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function DisclaimerModal() {
  const [hasAcceptedOnPage, setHasAcceptedOnPage] = useState(false);
  const hasAcceptedInSession = useSyncExternalStore(
    subscribeToAcceptance,
    getStoredAcceptance,
    () => false,
  );
  const hasAccepted = hasAcceptedOnPage || hasAcceptedInSession;
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!hasAccepted) {
      buttonRef.current?.focus();
    }
  }, [hasAccepted]);

  const acceptDisclaimer = () => {
    setHasAcceptedOnPage(true);

    try {
      sessionStorage.setItem(DISCLAIMER_STORAGE_KEY, "true");
      window.dispatchEvent(new Event(DISCLAIMER_ACCEPTED_EVENT));
    } catch {
      // Acceptance still applies to the current page when storage is unavailable.
    }
  };

  if (hasAccepted) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="disclaimer-title"
        aria-describedby="disclaimer-description"
        onKeyDown={(event) => {
          if (event.key === "Tab") {
            event.preventDefault();
            buttonRef.current?.focus();
          }
        }}
        className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl sm:p-10"
      >
        <p className="text-sm font-semibold tracking-[0.18em] text-violet-600 uppercase">
          Portfolio Demo
        </p>
        <h2
          id="disclaimer-title"
          className="mt-3 text-2xl font-bold text-slate-950 sm:text-3xl"
        >
          ご覧いただく前に
        </h2>
        <div
          id="disclaimer-description"
          className="mt-5 space-y-3 leading-7 text-slate-700"
        >
          <p>
            本サイトは採用選考用に制作した非公式・非商用のポートフォリオです。
          </p>
          <p>
            ANYCOLOR株式会社、にじさんじ、および各公式サービスとは関係ありません。
          </p>
          <p>
            掲載商品はすべてデモ用であり、実際の販売・注文・決済は行いません。
          </p>
        </div>
        <button
          ref={buttonRef}
          type="button"
          onClick={acceptDisclaimer}
          className="mt-8 w-full rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
        >
          内容を確認しました
        </button>
      </section>
    </div>
  );
}
