import { renderToString } from 'react-dom/server';
import App from './App.jsx';

export function render(lang = 'fa') {
  return renderToString(<App lang={lang} />);
}
