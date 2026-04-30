import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Data Deletion Request | Stunity',
  description: 'Request deletion of your Stunity account and associated data.',
};

const deletionSteps = [
  'Email privacy@stunity.app from the email address connected to your Stunity account.',
  'Use the subject line: Stunity account deletion request.',
  'Include your full name, school or organization name, role, and the account email address you want deleted.',
  'If you are requesting deletion for a student account, include your relationship to the student so we can verify authorization.',
];

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">Stunity</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Data Deletion Request</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
          You can request deletion of your Stunity account and associated personal data using the
          instructions below. This page applies to the Stunity mobile and web applications.
        </p>

        <section className="mt-10 border-t border-slate-200 pt-8">
          <h2 className="text-2xl font-semibold tracking-tight">How to request deletion</h2>
          <ol className="mt-4 space-y-3 text-base leading-7 text-slate-700">
            {deletionSteps.map((step, index) => (
              <li key={step} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-700 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10 border-t border-slate-200 pt-8">
          <h2 className="text-2xl font-semibold tracking-tight">What we delete</h2>
          <p className="mt-4 text-base leading-7 text-slate-700">
            After verifying your request, we delete or de-identify account information and personal
            data associated with your Stunity account, including profile details, authentication
            identifiers, uploaded profile media, and app data tied to your account where deletion is
            permitted.
          </p>
        </section>

        <section className="mt-10 border-t border-slate-200 pt-8">
          <h2 className="text-2xl font-semibold tracking-tight">Data we may retain</h2>
          <p className="mt-4 text-base leading-7 text-slate-700">
            Some records may be retained when required for school administration, legal compliance,
            security, fraud prevention, dispute resolution, backups, or other legitimate business
            purposes. Retained data is limited to what is necessary for those purposes.
          </p>
        </section>

        <section className="mt-10 border-t border-slate-200 pt-8">
          <h2 className="text-2xl font-semibold tracking-tight">Timing</h2>
          <p className="mt-4 text-base leading-7 text-slate-700">
            We will acknowledge deletion requests as soon as reasonably possible and complete
            verified requests within a reasonable period unless additional retention is required or
            permitted by law, school policy, or security needs.
          </p>
        </section>

        <section className="mt-10 border-t border-slate-200 pt-8">
          <h2 className="text-2xl font-semibold tracking-tight">Contact</h2>
          <p className="mt-4 text-base leading-7 text-slate-700">
            Email:{' '}
            <a className="font-semibold text-cyan-700 underline" href="mailto:privacy@stunity.app">
              privacy@stunity.app
            </a>
          </p>
          <p className="mt-3 text-sm text-slate-600">Effective date: April 30, 2026</p>
        </section>
      </section>
    </main>
  );
}
