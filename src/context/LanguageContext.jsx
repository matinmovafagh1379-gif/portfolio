import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { T } from '../translations.js';
import { PAGES, applyHead } from '../seo.js';

const LanguageContext = createContext(null);

// The URL decides the language: "/" is Persian, "/en/" is English. Each URL is
// prerendered separately, so search engines index both.
export function langFromPath(pathname) {
  return /^\/en(\/|$)/.test(pathname || '') ? 'en' : 'fa';
}

export function LanguageProvider({ children, initialLang = 'fa' }) {
  const [lang, setLangState] = useState(initialLang);
  const sceneApiRef = useRef(null);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    applyHead(lang);
  }, [lang]);

  const setLang = useCallback((l) => {
    setLangState(l);
    try { history.replaceState(history.state, '', PAGES[l].path + location.hash); } catch (e) {}
    sceneApiRef.current?.setLang(l);
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'fa' ? 'en' : 'fa');
  }, [lang, setLang]);

  const t = useCallback((key) => T[lang][key] ?? '', [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t, sceneApiRef }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
