import { useLanguage } from '../context/LanguageContext.jsx';

export default function Veil() {
  const { t } = useLanguage();
  return (
    <div id="veil" role="status">
      <span id="veiltext">{t('veil')}</span>
    </div>
  );
}
