import { useLanguage } from '../context/LanguageContext.jsx';
import { paragraphs } from '../translations.js';
import Gallery from './Gallery.jsx';

export default function About() {
  const { t } = useLanguage();
  return (
    <section className="ch about side" id="about">
      <div className="pin">
        <div className="panel">
          <Gallery />
          <h2>{t('about.h')}</h2>
          <p className="about-lead">{t('about.lead')}</p>
          {paragraphs(t('about.body')).map((text) => (
            <p key={text}>{text}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
