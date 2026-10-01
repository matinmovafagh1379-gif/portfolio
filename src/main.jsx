import { hydrateRoot, createRoot } from 'react-dom/client';
import App from './App.jsx';
import { langFromPath } from './context/LanguageContext.jsx';
import './global.css';

const container = document.getElementById('root');
const lang = langFromPath(location.pathname);

if (container.hasChildNodes()) {
  hydrateRoot(container, <App lang={lang} />);
} else {
  createRoot(container).render(<App lang={lang} />);
}
