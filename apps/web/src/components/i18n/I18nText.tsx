import { useTranslations } from 'next-intl';

export function I18nText({ i18nKey }: { i18nKey: string }) {
  const t = useTranslations();
  return <>{t(i18nKey)}</>;
}
