"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, ChevronLeft, Smartphone } from "lucide-react";
import {
  enrollPasswordless,
  startPhoneOtp,
  TokenManager,
  verifyPhoneOtp,
} from "@/lib/api/auth";
import { normalizePhonePreview } from "@/lib/auth/passwordless-phone";
import { getAuthRedirectPath } from "@/lib/auth/redirect";

type Step = "PHONE" | "OTP" | "PROFILE";
type Entry = "login" | "register";

type OtpChallenge = {
  challengeId: string;
  maskedDestination?: string;
  resendAt?: string;
  smsFallbackAvailable?: boolean;
};

export default function PasswordlessAuthCard({
  locale,
  entry = "login",
}: {
  locale: string;
  entry?: Entry;
}) {
  const t = useTranslations("auth.passwordless");
  const [step, setStep] = useState<Step>("PHONE");
  const [phone, setPhone] = useState("");
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [code, setCode] = useState("");
  const [enrollmentToken, setEnrollmentToken] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const firstNameInputRef = useRef<HTMLInputElement>(null);

  const phonePreview = normalizePhonePreview(phone);

  useEffect(() => {
    const target =
      step === "PHONE"
        ? phoneInputRef.current
        : step === "OTP"
          ? codeInputRef.current
          : firstNameInputRef.current;
    target?.focus();
  }, [step]);

  useEffect(() => {
    if (step !== "OTP") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [step]);

  const resendSeconds = challenge?.resendAt
    ? Math.max(
        0,
        Math.ceil((new Date(challenge.resendAt).getTime() - now) / 1000),
      )
    : 0;

  const start = async (preferredChannel: "AUTO" | "SMS" = "AUTO") => {
    if (!phonePreview) return;
    setLoading(true);
    setError("");
    try {
      const data = (await startPhoneOtp(
        phonePreview,
        preferredChannel,
      )) as OtpChallenge;
      setChallenge(data);
      setCode("");
      setNow(Date.now());
      setStep("OTP");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("sendError"));
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (!challenge) return;
    setLoading(true);
    setError("");
    try {
      const data = await verifyPhoneOtp(challenge.challengeId, code);
      if (data.status === "AUTHENTICATED") {
        TokenManager.setTokens(
          data.tokens.accessToken,
          data.tokens.refreshToken,
        );
        TokenManager.setUserData(data.user, data.school || null);
        window.location.href = getAuthRedirectPath(
          locale,
          data.user,
          data.school,
        );
        return;
      }
      setEnrollmentToken(data.enrollmentToken);
      setStep("PROFILE");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("verificationError"));
    } finally {
      setLoading(false);
    }
  };

  const enroll = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await enrollPasswordless({
        enrollmentToken,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        acceptedTermsVersion:
          process.env.NEXT_PUBLIC_TERMS_VERSION || "2026-07",
      });
      TokenManager.setTokens(data.tokens.accessToken, data.tokens.refreshToken);
      TokenManager.setUserData(data.user, null);
      window.location.href = getAuthRedirectPath(locale, data.user, null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("enrollmentError"));
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setError("");
    setStep(step === "PROFILE" ? "OTP" : "PHONE");
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step === "PHONE") void start();
    if (step === "OTP") void verify();
    if (step === "PROFILE") void enroll();
  };

  const title =
    step === "PHONE"
      ? t(entry === "register" ? "createTitle" : "signInTitle")
      : step === "OTP"
        ? t("otpTitle")
        : t("profileTitle");
  const subtitle =
    step === "PHONE"
      ? t(entry === "register" ? "createSubtitle" : "signInSubtitle")
      : step === "OTP"
        ? t("otpSubtitle", { destination: challenge?.maskedDestination || "" })
        : t("profileSubtitle");

  return (
    <main className="min-h-screen bg-gradient-to-b from-cyan-50 via-sky-50 to-white px-5 py-10 text-slate-950">
      <section
        aria-busy={loading}
        className="mx-auto w-full max-w-md rounded-[2rem] border border-white bg-white/90 p-7 shadow-2xl shadow-sky-100 backdrop-blur sm:p-9"
      >
        {step !== "PHONE" && (
          <button
            type="button"
            onClick={goBack}
            aria-label={t("back")}
            className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            <ChevronLeft aria-hidden="true" className="h-5 w-5" />
          </button>
        )}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-sky-700">
          <Smartphone aria-hidden="true" className="h-7 w-7" />
        </div>
        <h1 className="mt-6 text-center text-2xl font-black tracking-tight">
          {title}
        </h1>
        <p className="mt-3 text-center text-sm font-medium leading-6 text-slate-600">
          {subtitle}
        </p>
        <div aria-live="assertive" aria-atomic="true">
          {error && (
            <div
              role="alert"
              className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-center text-sm font-semibold text-rose-700"
            >
              {error}
            </div>
          )}
        </div>

        <form onSubmit={submit} className="mt-7">
          {step === "PHONE" && (
            <>
              <label
                htmlFor="passwordless-phone"
                className="text-sm font-bold text-slate-700"
              >
                {t("phoneLabel")}
              </label>
              <div className="mt-2 flex overflow-hidden rounded-2xl border border-slate-300 bg-white focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
                <span
                  aria-hidden="true"
                  className="flex items-center border-r border-slate-200 bg-slate-50 px-4 text-sm font-bold"
                >
                  🇰🇭 +855
                </span>
                <input
                  ref={phoneInputRef}
                  id="passwordless-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder={t("phonePlaceholder")}
                  aria-describedby="passwordless-phone-help passwordless-phone-preview"
                  className="min-w-0 flex-1 px-4 py-4 text-base outline-none"
                />
              </div>
              <p
                id="passwordless-phone-help"
                className="mt-2 text-xs font-medium leading-5 text-slate-500"
              >
                {t("phoneHelp")}
              </p>
              <p
                id="passwordless-phone-preview"
                className="mt-1 min-h-5 text-sm font-bold text-sky-700"
              >
                {phonePreview
                  ? t("canonicalPreview", { phone: phonePreview })
                  : ""}
              </p>
              <PrimaryButton
                label={t("continue")}
                loading={loading}
                disabled={!phonePreview}
                loadingLabel={t("pleaseWait")}
              />
              <Link
                href={`/${locale}/auth/login?method=password`}
                className="mt-5 block rounded text-center text-sm font-bold text-slate-600 hover:text-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
              >
                {t("passwordInstead")}
              </Link>
              {entry === "login" ? (
                <Link
                  href={`/${locale}/auth/register`}
                  className="mt-4 block rounded text-center text-sm font-bold text-sky-700 hover:text-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                >
                  {t("createAccount")}
                </Link>
              ) : (
                <Link
                  href={`/${locale}/auth/login`}
                  className="mt-4 block rounded text-center text-sm font-bold text-sky-700 hover:text-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                >
                  {t("alreadyHaveAccount")}
                </Link>
              )}
            </>
          )}

          {step === "OTP" && (
            <>
              <label htmlFor="passwordless-code" className="sr-only">
                {t("otpLabel")}
              </label>
              <input
                ref={codeInputRef}
                id="passwordless-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                aria-describedby="passwordless-code-help"
                className="w-full rounded-2xl border border-sky-200 px-4 py-5 text-center text-3xl font-black tracking-[0.35em] outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
              <p id="passwordless-code-help" className="sr-only">
                {t("otpHelp")}
              </p>
              <PrimaryButton
                label={t("verifyContinue")}
                loading={loading}
                disabled={code.length !== 6}
                loadingLabel={t("pleaseWait")}
              />
              <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm font-bold text-sky-700">
                <button
                  type="button"
                  disabled={resendSeconds > 0 || loading}
                  onClick={() => void start()}
                  className="min-h-11 rounded px-1 disabled:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                >
                  {resendSeconds
                    ? t("resendIn", { seconds: resendSeconds })
                    : t("codeNotReceived")}
                </button>
                {challenge?.smsFallbackAvailable && resendSeconds === 0 && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void start("SMS")}
                    className="min-h-11 rounded px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                  >
                    {t("useSms")}
                  </button>
                )}
              </div>
            </>
          )}

          {step === "PROFILE" && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="passwordless-first-name"
                  className="text-sm font-bold text-slate-700"
                >
                  {t("firstName")}
                </label>
                <input
                  ref={firstNameInputRef}
                  id="passwordless-first-name"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-5 py-4 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <div>
                <label
                  htmlFor="passwordless-last-name"
                  className="text-sm font-bold text-slate-700"
                >
                  {t("lastName")}
                </label>
                <input
                  id="passwordless-last-name"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-5 py-4 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl p-1 text-left text-sm leading-6 text-slate-700 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-sky-600">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(event) => setAccepted(event.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 accent-sky-600"
                />
                <span>{t("termsConsent")}</span>
              </label>
              <PrimaryButton
                label={t("createAccount")}
                loading={loading}
                disabled={!firstName.trim() || !lastName.trim() || !accepted}
                loadingLabel={t("pleaseWait")}
              />
            </div>
          )}
        </form>
      </section>
    </main>
  );
}

function PrimaryButton({
  label,
  loadingLabel,
  loading,
  disabled,
}: {
  label: string;
  loadingLabel: string;
  loading: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-200 transition hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        loadingLabel
      ) : (
        <>
          {label}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </>
      )}
    </button>
  );
}
