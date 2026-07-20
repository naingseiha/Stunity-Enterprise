"use client";

import { use } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LockKeyhole, School } from "lucide-react";
import PasswordlessAuthCard from "@/components/auth/PasswordlessAuthCard";

export default function RegisterPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(props.params);
  const t = useTranslations("auth.passwordless");

  if (process.env.NEXT_PUBLIC_PASSWORDLESS_AUTH_ENABLED === "true") {
    return <PasswordlessAuthCard locale={locale} entry="register" />;
  }

  return (
    <main className="flex min-h-screen items-center bg-gradient-to-b from-cyan-50 via-sky-50 to-white px-5 py-10 text-slate-950">
      <section className="mx-auto w-full max-w-md rounded-[2rem] border border-white bg-white/90 p-7 text-center shadow-2xl shadow-sky-100 backdrop-blur sm:p-9">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-700">
          <LockKeyhole aria-hidden="true" className="h-7 w-7" />
        </div>
        <h1 className="mt-6 text-2xl font-black tracking-tight">
          {t("registrationUnavailableTitle")}
        </h1>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
          {t("registrationUnavailableBody")}
        </p>
        <Link
          href={`/${locale}/auth/login`}
          className="mt-7 flex min-h-12 w-full items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-200 hover:bg-sky-700"
        >
          {t("backToSignIn")}
        </Link>
        <Link
          href={`/${locale}/register-school`}
          className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          <School aria-hidden="true" className="h-4 w-4" />
          {t("registerSchool")}
        </Link>
      </section>
    </main>
  );
}
