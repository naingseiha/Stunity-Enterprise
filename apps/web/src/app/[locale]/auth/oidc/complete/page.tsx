"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { exchangeTelegramOidcSession, TokenManager } from "@/lib/api/auth";
import { getAuthRedirectPath } from "@/lib/auth/redirect";

export default function OidcCompletePage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(props.params);
  const t = useTranslations("auth.passwordless");
  const router = useRouter();
  const searchParams = useSearchParams();
  const exchanged = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (exchanged.current) return;
    exchanged.current = true;

    const status = searchParams?.get("status");
    const code = searchParams?.get("code");

    if (status !== "ok" || !code) {
      setError(t("oidcError"));
      return;
    }

    exchangeTelegramOidcSession(code)
      .then((data) => {
        if (data.requires2FA) {
          // Web two-factor challenge UI for federated sign-in is not built
          // yet; send the user to password sign-in rather than stall here.
          setError(t("oidcError"));
          return;
        }
        TokenManager.setTokens(data.tokens.accessToken, data.tokens.refreshToken);
        TokenManager.setUserData(data.user, data.school || null);
        window.location.href = getAuthRedirectPath(locale, data.user, data.school);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t("oidcError"));
      });
  }, [locale, searchParams, t]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-cyan-50 via-sky-50 to-white px-5 text-slate-950">
      <section className="mx-auto w-full max-w-md rounded-[2rem] border border-white bg-white/90 p-9 text-center shadow-2xl shadow-sky-100 backdrop-blur">
        {error ? (
          <>
            <p role="alert" className="text-sm font-semibold text-rose-700">
              {error}
            </p>
            <button
              type="button"
              onClick={() => router.replace(`/${locale}/auth/login`)}
              className="mt-6 min-h-11 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
            >
              {t("oidcTryAgain")}
            </button>
          </>
        ) : (
          <p className="text-sm font-semibold text-slate-600">{t("oidcCompleting")}</p>
        )}
      </section>
    </main>
  );
}
