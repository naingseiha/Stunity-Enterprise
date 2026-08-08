import { redirect } from 'next/navigation';

export default async function LegacyYearEndWorkflowPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ yearId?: string | string[] }>;
}) {
  const [{ locale }, query] = await Promise.all([props.params, props.searchParams]);
  const yearId = Array.isArray(query.yearId) ? query.yearId[0] : query.yearId;
  redirect(`/${locale}/settings/promotion${yearId ? `?yearId=${encodeURIComponent(yearId)}` : ''}`);
}
