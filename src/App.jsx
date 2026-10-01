import { useEffect, useRef } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext.jsx';
import Veil from './components/Veil.jsx';
import NavBar from './components/NavBar.jsx';
import Rail from './components/Rail.jsx';
import Hero from './components/Hero.jsx';
import Coffee from './components/Coffee.jsx';
import Code from './components/Code.jsx';
import About from './components/About.jsx';
import Skills from './components/Skills.jsx';
import Work from './components/Work.jsx';
import Contact from './components/Contact.jsx';

function Scene() {
  const { lang, sceneApiRef } = useLanguage();
  const startedRef = useRef(false);
  const langRef = useRef(lang);
  langRef.current = lang;

  useEffect(() => {
    // The scene owns a persistent render loop and global listeners with no
    // teardown, so it must only ever be initialized once per page load.
    if (startedRef.current) return;
    startedRef.current = true;
    import('./three/scene.js')
      .then(({ initScene }) => {
        sceneApiRef.current = initScene(langRef.current);
        sceneApiRef.current.setLang(langRef.current);
      })
      .catch(() => {
        document.documentElement.classList.add('no-webgl', 'ready');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas id="gl" aria-hidden="true"></canvas>;
}

function AppInner() {
  return (
    <>
      <Veil />
      <Scene />
      <NavBar />
      <Rail />
      <main className="story">
        <Hero />
        <Coffee />
        <Code />
        <About />
        <Skills />
        <Work />
        <Contact />
      </main>
    </>
  );
}

export default function App({ lang = 'fa' }) {
  return (
    <LanguageProvider initialLang={lang}>
      <AppInner />
    </LanguageProvider>
  );
}
