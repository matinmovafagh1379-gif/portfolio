// Personal links, project URLs and which photo goes where in the 3D scene.
// Photos live in /public/images; their alt text and dimensions are in seo.js.
import { imagePath, PROJECT_URLS } from './seo.js';

export const CONFIG = {
  linkedin:  'https://www.linkedin.com/in/matin-movafagh/',
  github:    'https://github.com/matinmovafagh1379-gif',
  instagram: 'https://www.instagram.com/matin_movafagh/',
  telegram:  'https://t.me/Matin_movafagh',
  video:     '',   // optional intro video, played on the monitor during the About chapter
  photo:     '',   // optional fallback for any photo slot below
  photos: {
    frame:     imagePath('matin-movafagh-smiling-portrait.webp'),                      // framed photo on the desk
    avatar:    imagePath('matin-movafagh-developer-at-coding-desk.webp'),         // profile card on the monitor
    polaroid:  imagePath('matin-movafagh-coffee-shop-laptop.jpg'),                     // photo taped to the notebook
    polaroid2: imagePath('matin-movafagh-city-skyline-night.jpg'),                     // second photo taped to the notebook
    phone:     imagePath('matin-movafagh-avatar.jpg'),                                 // avatar on the phone screen
    // Screenshots shown inside the monitor's project window (fit: 'cover' crop anchored at fx/fy)
    shots: {
      w1: [{ src: imagePath('matin-movafagh-gamezone-3d-gaming-cafe-website.webp'), fx: 0.5, fy: 0.5 }],
      w2: [{ src: imagePath('matin-movafagh-otaghbazi-kids-play-room-website.webp'), fx: 0.5, fy: 0 }],
      w3: [{ src: imagePath('matin-movafagh-trading-crm-dashboard.webp'), fx: 0.5, fy: 0, stack: true }, { src: imagePath('matin-movafagh-trading-crm-expenses.webp'), fx: 0.5, fy: 0 }],
      w4: [{ src: imagePath('matin-movafagh-pasargad-3d-cyrus-era.webp'), fx: 0.5, fy: 0.5 }, { src: imagePath('matin-movafagh-pasargad-3d-today.webp'), fx: 0.5, fy: 0.5 }],
      w5: [{ src: imagePath('matin-movafagh-flex-cafe-css-flexbox-game.webp'), fx: 0.5, fy: 0 }, { src: imagePath('matin-movafagh-timeline-guardian-git-game.webp'), fx: 0.5, fy: 0 }],
    },
    // Loose prints on the stack of books, bottom to top.
    desk: [
      imagePath('matin-movafagh-portrait-city-at-night.webp'),
      imagePath('matin-movafagh-working-on-laptop.webp'),
      imagePath('matin-movafagh-developer-at-coding-desk.webp'),
      imagePath('matin-movafagh-frontend-developer.jpg'),
    ],
  },
  projects: PROJECT_URLS,
};
