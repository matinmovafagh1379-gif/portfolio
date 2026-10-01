import { useLanguage } from '../context/LanguageContext.jsx';

export default function NavBar() {
  const { lang, t, toggleLang } = useLanguage();
  return (
    <header className="bar">
      <a className="mark" href="#top" aria-label="Matin Movafagh">MM</a>
      <button
        id="lang"
        type="button"
        aria-label={t('lang.aria')}
        onClick={toggleLang}
      >
        {t('lang.btn')}
      </button>
    </header>
  );
}
