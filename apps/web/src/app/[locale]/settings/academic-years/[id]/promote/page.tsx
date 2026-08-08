import { redirect } from 'next/navigation';

export default async function LegacyPromotionPage(props: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await props.params;
  redirect(`/${locale}/settings/promotion?yearId=${encodeURIComponent(id)}`);
}
