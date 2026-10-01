import { useLanguage } from '../context/LanguageContext.jsx';

export default function Code() {
  const { t } = useLanguage();
  return (
    <section className="ch code statement">
      <div className="pin">
        <h2>{t('code.h')}</h2>
        <p className="lead">{t('code.p')}</p>
      </div>
    </section>
  );
}
