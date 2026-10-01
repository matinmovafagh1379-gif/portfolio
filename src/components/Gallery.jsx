import { useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { IMAGES, imagePath } from '../seo.js';

const SWIPE_DISTANCE = 40;

function Chevron({ flip }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Circular photo carousel. Every photo is a real <img> in the markup (that is
// what lets Google Images index them); the track only slides them into view.
export default function Gallery() {
  const { t, lang } = useLanguage();
  const [index, setIndex] = useState(0);
  const touchStart = useRef(null);
  const count = IMAGES.length;
  const number = new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en');

  const go = (step) => setIndex((i) => (i + step + count) % count);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
  };
  const onPointerDown = (e) => { touchStart.current = e.clientX; };
  const onPointerUp = (e) => {
    if (touchStart.current === null) return;
    const dx = e.clientX - touchStart.current;
    touchStart.current = null;
    if (Math.abs(dx) >= SWIPE_DISTANCE) go(dx < 0 ? 1 : -1);
  };

  return (
    <div className="gallery" dir="ltr" role="group" aria-roledescription="carousel" aria-label={t('photos.h')}>
      <button type="button" className="gallery-btn" onClick={() => go(-1)} aria-label={t('photos.prev')}>
        <Chevron flip />
      </button>

      <div
        className="gallery-view"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { touchStart.current = null; }}
      >
        <ul className="gallery-track" style={{ transform: `translateX(${-index * 100}%)` }}>
          {IMAGES.map((img, i) => (
            <li
              key={img.file}
              className="gallery-slide"
              role="group"
              aria-roledescription="slide"
              aria-label={`${number.format(i + 1)} / ${number.format(count)}`}
              aria-hidden={i !== index}
            >
              <img
                src={imagePath(img.file)}
                alt={img[lang]}
                width={img.w}
                height={img.h}
                loading="lazy"
                decoding="async"
                draggable="false"
                style={{ objectPosition: img.focus }}
              />
            </li>
          ))}
        </ul>
      </div>

      <button type="button" className="gallery-btn" onClick={() => go(1)} aria-label={t('photos.next')}>
        <Chevron />
      </button>

      <p className="gallery-count" dir={lang === 'fa' ? 'rtl' : 'ltr'} aria-live="polite">
        {t('photos.h')} · {number.format(index + 1)} / {number.format(count)}
      </p>
    </div>
  );
}
