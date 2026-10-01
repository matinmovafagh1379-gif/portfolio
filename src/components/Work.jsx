import { useLanguage } from '../context/LanguageContext.jsx';
import { paragraphs } from '../translations.js';
import { CONFIG } from '../config.js';

// `id` matches the w1/w2/w3 keys in translations.js and the data-p hook used by the 3D scene.
const PROJECTS = [
  { id: 'w1' },
  { id: 'w2', url: CONFIG.projects.otaghbazi },
  { id: 'w3', url: CONFIG.projects.tradingCrm },
];

export default function Work() {
  const { t } = useLanguage();
  return (
    <section className="ch work" id="work" aria-label={t('work.label')}>
      <div className="pin">
        <div className="wrap">
          <button type="button" id="screenClose" className="screen-close">{t('work.close')}</button>
          <h2>{t('work.h')}</h2>
          <p className="lead">{t('work.p')}</p>
          <p className="hint">{t('work.hint')}</p>
          <ul className="rows">
            {PROJECTS.map(({ id, url }) => (
              <li className="row" data-p={id} tabIndex={0} role="button" key={id}>
                <h3>{t(`${id}.t`)}</h3>
                <div className="desc">
                  {paragraphs(t(`${id}.d`)).map((text) => (
                    <p key={text}>{text}</p>
                  ))}
                </div>
                <span className="state">
                  <span>{t(`${id}.s`)}</span>
                  {url && (
                    <a
                      className="live"
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t('w.live')}
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
