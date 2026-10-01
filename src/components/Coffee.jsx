import { useLanguage } from '../context/LanguageContext.jsx';

export default function Coffee() {
  const { t } = useLanguage();
  return (
    <section className="ch coffee statement">
      <div className="pin">
        <h2>{t('coffee.h')}</h2>
        <p className="lead">{t('coffee.p')}</p>
      </div>
    </section>
  );
}
