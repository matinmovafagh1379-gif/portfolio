import { useLanguage } from '../context/LanguageContext.jsx';
import { CONFIG } from '../config.js';

const LINKS = [
  ['linkedin', CONFIG.linkedin],
  ['github', CONFIG.github],
  ['instagram', CONFIG.instagram],
  ['telegram', CONFIG.telegram],
];

export default function Contact() {
  const { t } = useLanguage();
  return (
    <section className="ch contact side" id="contact">
      <div className="pin">
        <h2>{t('contact.h')}</h2>
        <p className="lead">{t('contact.p')}</p>
        <div className="links" id="links">
          {LINKS.map(([name, href]) => (
            <a key={name} href={href} target="_blank" rel="noopener noreferrer">
              {t(`l.${name}`)}
            </a>
          ))}
        </div>
        <p className="foot">{t('foot')}</p>
      </div>
    </section>
  );
}
