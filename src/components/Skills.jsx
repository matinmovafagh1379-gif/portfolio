import { useLanguage } from '../context/LanguageContext.jsx';

const TOOLS = ['HTML', 'CSS', 'JavaScript', 'React', 'Git', 'GitHub', 'Vite', 'Tailwind'];

export default function Skills() {
  const { t } = useLanguage();
  return (
    <section className="ch skills side" id="skills">
      <div className="pin">
        <div className="panel">
          <h2>{t('skills.h')}</h2>
          <ul className="tools">
            {TOOLS.map((tool) => (
              <li dir="ltr" key={tool}>{tool}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
