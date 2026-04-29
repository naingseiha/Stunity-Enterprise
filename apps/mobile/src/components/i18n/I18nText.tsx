import { useTranslation } from 'react-i18next';

export function I18nText({ i18nKey }: { i18nKey: string }) {
  const { t } = useTranslation();
  return <>{t(i18nKey)}</>;
}
