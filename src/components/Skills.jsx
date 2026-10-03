import { useLanguage } from '../context/LanguageContext.jsx';
import { ICONS } from '../icons.js';

// HTML and CSS are left out on purpose: they are the baseline for any web work.
const TOOLS = [
  { name: 'JavaScript', icons: ['javascript'] },
  { name: 'React', icons: ['react'] },
  { name: 'Git & GitHub', icons: ['git', 'github'] },
  { name: 'Vite', icons: ['vite'] },
  { name: 'Tailwind', icons: ['tailwind'] },
];

function Mark({ name }) {
  const { color, d } = ICONS[name];
  return (
    <svg className="tool-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <path fill={color} d={d} />
    </svg>
  );
}

export default function Skills() {
  const { t } = useLanguage();
  return (
    <section className="ch skills side" id="skills">
      <div className="pin">
        <div className="panel">
          <h2>{t('skills.h')}</h2>
          <ul className="tools">
            {TOOLS.map(({ name, icons }) => (
              <li dir="ltr" key={name}>
                <span className="tool-marks">
                  {icons.map((icon) => <Mark key={icon} name={icon} />)}
                </span>
                {name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
