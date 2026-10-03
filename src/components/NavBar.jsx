import { useLanguage } from '../context/LanguageContext.jsx';
import { PAGES } from '../seo.js';

export default function NavBar() {
  const { lang, t, toggleLang } = useLanguage();
  const other = lang === 'fa' ? 'en' : 'fa';
  return (
    <header className="bar">
      <a className="mark" href="#top" aria-label="Matin Movafagh">MM</a>
      <a
        id="lang"
        href={PAGES[other].path}
        hrefLang={other}
        lang={other}
        aria-label={t('lang.aria')}
        onClick={(e) => {
          // Plain clicks switch language in place; modified clicks (new tab) follow the link.
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          toggleLang();
        }}
      >
        {t('lang.btn')}
      </a>
    </header>
  );
}
