import { useLanguage } from '../context/LanguageContext.jsx';
import { IMAGES, imagePath } from '../seo.js';

// A small row of REAL <img> tags at the very end of the page. The photos in the
// 3D desk scene only exist as canvas pixels (invisible to Google); these are what
// Google Images can actually crawl. Keep them visible — hidden images get ignored.
export default function PhotoStrip() {
  const { lang, t } = useLanguage();
  return (
    <nav className="photostrip" aria-label={t('photos.h')}>
      <span className="photostrip-h">{t('photos.h')}</span>
      <ul>
        {IMAGES.map((im) => (
          <li key={im.file}>
            <a href={imagePath(im.file)} target="_blank" rel="noopener noreferrer" title={im[lang]}>
              <img
                src={imagePath(im.file)}
                alt={im[lang]}
                width={im.w}
                height={im.h}
                decoding="async"
              />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
