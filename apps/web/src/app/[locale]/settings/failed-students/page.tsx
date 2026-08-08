import { redirect } from 'next/navigation';

export default async function LegacyFailedStudentsPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  redirect(`/${locale}/settings/promotion?filter=REPEAT`);
}
