import { Fragment } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';

const NAME = 'Matin Movafagh';

function AnimatedName() {
  return (
    <h1 id="name" aria-label={NAME}>
      {NAME.split(' ').map((word, wi) => {
        let n = wi * 6;
        return (
          <Fragment key={wi}>
            {wi > 0 && ' '}
            <span className="word" aria-hidden="true">
              {[...word].map((ch, ci) => (
                <span className="ltr" style={{ '--i': n++ }} key={ci}>{ch}</span>
              ))}
            </span>
          </Fragment>
        );
      })}
    </h1>
  );
}

export default function Hero() {
  const { t } = useLanguage();
  return (
    <section className="ch hero" id="top">
      <div className="pin">
        <AnimatedName />
        <p className="role">{t('hero.role')}</p>
        <div className="scrollhint">{t('hero.scroll')}</div>
      </div>
    </section>
  );
}
