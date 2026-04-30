import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Stunity',
  description: 'Privacy Policy for Stunity web and mobile applications.',
};

const sections = [
  {
    title: 'Information We Collect',
    body: [
      'Account information such as name, email address, role, school, class, and profile details.',
      'School activity information such as attendance, course activity, grades, events, messages, clubs, posts, comments, reactions, and uploaded media.',
      'Device and app information such as device type, operating system, app version, push notification token, diagnostics, and basic usage logs.',
      'Camera, photo library, microphone, and location data only when you choose to use app features that require those permissions.',
    ],
  },
  {
    title: 'How We Use Information',
    body: [
      'To provide school communication, learning, attendance, messaging, profile, media sharing, and account features.',
      'To authenticate users, protect accounts, prevent abuse, troubleshoot issues, and improve reliability.',
      'To send important notifications related to school activity, messages, account access, and app updates.',
      'To comply with legal, safety, security, and school administration requirements.',
    ],
  },
  {
    title: 'Camera, Photos, Microphone, and Location',
    body: [
      'Camera and photo access are used to let users capture or upload profile photos, post media, and other school-related content.',
      'Microphone access is used only when recording videos or using features that require audio.',
      'Location access is used only for features such as school check-in or location-based verification when enabled.',
      'You can manage these permissions at any time in your device settings.',
    ],
  },
  {
    title: 'Sharing and Disclosure',
    body: [
      'We do not sell personal information.',
      'Information may be visible to authorized school administrators, teachers, parents, students, or staff depending on the user role and feature being used.',
      'We may share information with trusted service providers that help operate Stunity, such as hosting, database, storage, analytics, messaging, authentication, and notification providers.',
      'We may disclose information if required by law or to protect users, schools, Stunity, or the public.',
    ],
  },
  {
    title: 'Data Security and Retention',
    body: [
      'We use technical and organizational measures designed to protect personal information.',
      'Information is retained for as long as needed to provide Stunity, support school operations, comply with legal obligations, resolve disputes, and maintain security.',
      'Schools and authorized administrators may request updates, corrections, exports, or deletion where applicable.',
    ],
  },
  {
    title: 'Children and School Use',
    body: [
      'Stunity is designed for school communities and may be used by students with school or parent involvement.',
      'Schools, parents, and guardians are responsible for authorizing student use where required by applicable law and school policy.',
    ],
  },
  {
    title: 'Contact',
    body: [
      'For privacy questions or requests, contact Stunity at privacy@stunity.app.',
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">Stunity</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Privacy Policy</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
          This Privacy Policy explains how Stunity collects, uses, shares, and protects information
          when you use the Stunity web and mobile applications.
        </p>
        <p className="mt-4 text-sm text-slate-600">Effective date: April 30, 2026</p>

        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section.title} className="border-t border-slate-200 pt-8">
              <h2 className="text-2xl font-semibold tracking-tight">{section.title}</h2>
              <ul className="mt-4 space-y-3 text-base leading-7 text-slate-700">
                {section.body.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
