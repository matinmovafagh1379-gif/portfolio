import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { T, paragraphs } from '../translations.js';

// The 3D desk: camera path driven by scroll, lighting, props (cup, monitor,
// phone, photo frame, prints) and the canvas-drawn monitor and phone screens.
// It finds its DOM hooks by class/id, so the markup in src/components must keep
// the same ids, classes and data attributes.
export function initScene(initialLang) {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* sections */
const sections = $$('.ch');
const pins = sections.map(s => $('.pin', s));
const N = sections.length;
let centers = [], heights = [], vh = innerHeight;
function measure() {
  vh = innerHeight;
  const y = scrollY;
  centers = sections.map(s => { const r = s.getBoundingClientRect(); return r.top + y + r.height / 2; });
  heights = sections.map(s => s.offsetHeight);
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
function scrollU() {
  const view = scrollY + vh / 2;
  if (view <= centers[0]) return 0;
  if (view >= centers[N - 1]) return N - 1;
  let i = 0; while (i < N - 2 && view >= centers[i + 1]) i++;
  const f = (view - centers[i]) / (centers[i + 1] - centers[i]);
  return i + smooth(0.14, 0.86, f);
}
const railFill = $('#rail i');
const shownOpacity = new Array(N).fill('');
let shownRail = '';
function updateText() {
  const view = scrollY + vh / 2;
  for (let i = 0; i < N; i++) {
    const t = Math.abs(view - centers[i]) / (heights[i] / 2);
    const a = 1 - smooth(0.5, 1.0, t);
    const o = a.toFixed(3);
    if (o === shownOpacity[i]) continue;
    shownOpacity[i] = o;
    pins[i].style.opacity = o;
    pins[i].style.pointerEvents = a < 0.2 ? 'none' : '';
  }
  const max = document.documentElement.scrollHeight - vh;
  const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
  const rail = (p * 100).toFixed(2) + '%';
  if (rail !== shownRail) { shownRail = rail; railFill.style.height = rail; }
}

/* language: set by React through setLang() */
let lang = initialLang || 'fa';
let onLangChange = null;

function start3D() {
  if (typeof THREE === 'undefined') { root.classList.add('no-webgl', 'ready'); return; }
  const coarse = matchMedia('(pointer: coarse)').matches || innerWidth < 760;
  // High-density screens already hide aliasing, and MSAA at 2x is expensive.
  const dpr = devicePixelRatio || 1;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: $('#gl'), antialias: !coarse && dpr < 1.75, alpha: false, powerPreference: coarse ? 'default' : 'high-performance', failIfMajorPerformanceCaveat: false });
  } catch (e) {
    try { renderer = new THREE.WebGLRenderer({ canvas: $('#gl'), antialias: false }); }
    catch (e2) { root.classList.add('no-webgl', 'ready'); return; }
  }
  $('#gl').addEventListener('webglcontextlost', (e) => { e.preventDefault(); root.classList.add('no-webgl'); }, false);

  // Same base sharpness as before. The floor is what the adaptive step below may drop to,
  // and it stays high so a slow device never ends up looking blurry.
  const MIN_RATIO = coarse ? 1.25 : 1.5;
  renderer.setPixelRatio(Math.min(dpr, coarse ? 1.5 : 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = !coarse;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Only the cup and the phone ever move, so the shadow map is refreshed on demand.
  renderer.shadowMap.autoUpdate = false;

  const WARM_BG = new THREE.Color(0x160e0a), COOL_BG = new THREE.Color(0x09111a);
  const scene = new THREE.Scene();
  scene.background = WARM_BG.clone();
  scene.fog = new THREE.FogExp2(0x160e0a, 0.035);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);

  /* helpers */
  const mat = (o) => new THREE.MeshStandardMaterial(o);
  function rrShape(w, h, r) {
    const s = new THREE.Shape();
    s.moveTo(r, 0); s.lineTo(w - r, 0); s.quadraticCurveTo(w, 0, w, r);
    s.lineTo(w, h - r); s.quadraticCurveTo(w, h, w - r, h);
    s.lineTo(r, h); s.quadraticCurveTo(0, h, 0, h - r);
    s.lineTo(0, r); s.quadraticCurveTo(0, 0, r, 0);
    return s;
  }
  function roundedBox(w, h, d, r, material) {
    const g = new THREE.ExtrudeGeometry(rrShape(w, h, r), { depth: d, bevelEnabled: false, curveSegments: 8 });
    g.translate(-w / 2, -h / 2, -d / 2);
    const m = new THREE.Mesh(g, material); m.castShadow = m.receiveShadow = true; return m;
  }
  function limb(a, b, rad, material) {
    const dir = new THREE.Vector3().subVectors(b, a), len = dir.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, len, 14), material);
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    m.castShadow = true; return m;
  }

  /* lights */
  scene.add(new THREE.HemisphereLight(0x4a3a55, 0x2a1a12, 0.6));
  const rim = new THREE.DirectionalLight(0x6ea8ff, 0.35); rim.position.set(-4, 4, -5); scene.add(rim);

  const lampSpot = new THREE.SpotLight(0xffb066, 2.6, 14, 0.62, 0.85, 1.2);
  lampSpot.position.set(3.0, 2.3, -0.3); lampSpot.target.position.set(2.2, 0, 0.6);
  lampSpot.castShadow = true; lampSpot.shadow.mapSize.set(1024, 1024); lampSpot.shadow.bias = -0.0006;
  scene.add(lampSpot, lampSpot.target);

  const cupLight = new THREE.SpotLight(0xffc58a, 2.4, 14, 0.55, 1, 1.2);
  cupLight.position.set(-3.2, 3.4, 3.6); cupLight.target.position.set(-1.5, 0.3, 1.1);
  scene.add(cupLight, cupLight.target);

  const screenLight = new THREE.PointLight(0x7fd6ff, 0.2, 9, 1.4);
  screenLight.position.set(1.0, 1.5, 1.1); scene.add(screenLight);

  /* window with city bokeh */
  (function windowBackdrop() {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#0b0d18'); g.addColorStop(0.6, '#1a1220'); g.addColorStop(1, '#2a1712');
    x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 110; i++) {
      const px = rnd() * 1024, py = 200 + rnd() * 312, r = 8 + rnd() * 34;
      const warm = rnd() > 0.35; const col = warm ? '255,171,92' : '127,214,255';
      const rg = x.createRadialGradient(px, py, 0, px, py, r);
      rg.addColorStop(0, `rgba(${col},${0.35 + rnd() * 0.4})`); rg.addColorStop(0.7, `rgba(${col},${0.12})`); rg.addColorStop(1, `rgba(${col},0)`);
      x.fillStyle = rg; x.beginPath(); x.arc(px, py, r, 0, 6.2832); x.fill();
    }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(22, 11), new THREE.MeshBasicMaterial({ map: t, fog: false, toneMapped: false }));
    p.position.set(0.5, 4.0, -5.2); scene.add(p);
    const frameM = mat({ color: 0x0d0806, roughness: 0.9 });
    [[-4.2, 0], [1.2, 0], [6.4, 0]].forEach(([px]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.28, 11, 0.3), frameM); b.position.set(px, 4.0, -5.0); scene.add(b); });
    const hb = new THREE.Mesh(new THREE.BoxGeometry(22, 0.28, 0.3), frameM); hb.position.set(0.5, 3.1, -5.0); scene.add(hb);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 8), mat({ color: 0x1a110d, roughness: 1 }));
    wall.position.set(0, -1.6, -4.9); scene.add(wall);
  })();

  /* desk */
  (function desk() {
    const c = document.createElement('canvas'); c.width = 512; c.height = 512; const x = c.getContext('2d');
    x.fillStyle = '#4d3222'; x.fillRect(0, 0, 512, 512);
    let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 220; i++) {
      const y = rnd() * 512, l = 0.3 + rnd() * 0.5;
      x.strokeStyle = rnd() > 0.5 ? `rgba(20,10,4,${0.08 + rnd() * 0.16})` : `rgba(140,90,55,${0.05 + rnd() * 0.1})`;
      x.lineWidth = 1 + rnd() * 2.5; x.beginPath(); x.moveTo(0, y);
      x.bezierCurveTo(170, y + (rnd() - 0.5) * 10, 340, y + (rnd() - 0.5) * 10, 512, y + (rnd() - 0.5) * 6); x.stroke();
    }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 2.4); t.anisotropy = 8;
    const d = new THREE.Mesh(new THREE.BoxGeometry(30, 0.3, 18), mat({ map: t, roughness: 0.55, metalness: 0.04 }));
    d.position.set(0.8, -0.15, 5.2); d.receiveShadow = true; scene.add(d);
  })();

  /* coffee cup */
  const CUP_BASE = new THREE.Vector3(-1.5, 0.05, 1.1);
  const cup = new THREE.Group(); cup.position.copy(CUP_BASE);
  const ceramic = new THREE.MeshPhysicalMaterial({ color: 0x5c6136, roughness: 0.48, clearcoat: 0.25, clearcoatRoughness: 0.35, side: THREE.DoubleSide });
  const cupPts = [[0.001, 0], [0.32, 0], [0.335, 0.016], [0.305, 0.032], [0.32, 0.09], [0.345, 0.30], [0.365, 0.50], [0.375, 0.585], [0.375, 0.60], [0.355, 0.607], [0.355, 0.585], [0.29, 0.10], [0.001, 0.07]].map(p => new THREE.Vector2(p[0], p[1]));
  const cupBody = new THREE.Mesh(new THREE.LatheGeometry(cupPts, 64), ceramic); cupBody.castShadow = cupBody.receiveShadow = true; cup.add(cupBody);
  const rimAccent = new THREE.Mesh(new THREE.TorusGeometry(0.362, 0.01, 10, 48), new THREE.MeshStandardMaterial({ color: 0xf2dfc4, roughness: 0.4 }));
  rimAccent.rotation.x = Math.PI / 2; rimAccent.position.y = 0.598; cup.add(rimAccent);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.148, 0.028, 18, 36, Math.PI * 1.06), ceramic);
  handle.rotation.z = -Math.PI / 2 - 0.03; handle.position.set(0.34, 0.31, 0); handle.castShadow = true; cup.add(handle);
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(1, 56), new THREE.MeshStandardMaterial({ color: 0x2b1509, roughness: 0.12, metalness: 0.15 }));
  cup.add(coffee);
  scene.add(cup);
  const saucer = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.5, 0], [0.8, 0.03], [0.88, 0.07], [0.9, 0.09], [0.86, 0.085], [0.8, 0.05], [0.4, 0.035], [0.001, 0.035]].map(p => new THREE.Vector2(p[0], p[1])), 64), ceramic);
  saucer.position.set(CUP_BASE.x, 0, CUP_BASE.z); saucer.castShadow = saucer.receiveShadow = true; scene.add(saucer);

  /* steam */
  const steamU = { uTime: { value: 0 }, uScale: { value: 800 }, uAmt: { value: 1 } };
  const steamGeo = new THREE.BufferGeometry(); const SN = coarse ? 90 : 150;
  const sp = new Float32Array(SN * 3), sd = new Float32Array(SN * 4);
  for (let i = 0; i < SN * 4; i++) sd[i] = Math.random();
  steamGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3)); steamGeo.setAttribute('seed', new THREE.BufferAttribute(sd, 4));
  const steam = new THREE.Points(steamGeo, new THREE.ShaderMaterial({
    uniforms: steamU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec4 seed; uniform float uTime; uniform float uScale; uniform float uAmt; varying float vA;
      void main(){
        float life = fract(uTime*0.11*(0.6+seed.x*0.8) + seed.y);
        float h = life*1.7;
        float ang = seed.z*6.2831 + life*2.5*(seed.w-0.5);
        float r = 0.05 + 0.10*seed.w + life*0.22*seed.x;
        vec3 p = vec3(cos(ang)*r + sin(uTime*0.55+seed.y*9.0+life*4.5)*0.13*life, h, sin(ang)*r);
        vA = sin(life*3.14159) * uAmt * 0.1;
        vec4 mv = modelViewMatrix*vec4(p,1.0);
        gl_PointSize = (0.14 + life*0.42) * uScale / -mv.z;
        gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: `
      varying float vA;
      void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.0,d)*vA; gl_FragColor = vec4(1.0,0.86,0.72,a); }`
  }));
  steam.frustumCulled = false; scene.add(steam);

  /* monitor + keyboard */
  const MON = new THREE.Vector3(1.0, 0, -0.5);
  const metal = mat({ color: 0x2b2a2e, roughness: 0.4, metalness: 0.7 });
  const monitor = new THREE.Group(); monitor.position.copy(MON); scene.add(monitor);
  const mBase = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.05, 48), metal); mBase.position.y = 0.025; mBase.castShadow = mBase.receiveShadow = true; monitor.add(mBase);
  const mNeck = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.85, 0.07), metal); mNeck.position.set(0, 0.45, -0.06); mNeck.castShadow = true; monitor.add(mNeck);
  const mBody = roundedBox(2.9, 1.7, 0.09, 0.07, mat({ color: 0x1c1b20, roughness: 0.45, metalness: 0.5 })); mBody.position.set(0, 1.5, -0.04); monitor.add(mBody);

  const SC = document.createElement('canvas'); SC.width = 1280; SC.height = 720; const sx = SC.getContext('2d');
  const screenTex = new THREE.CanvasTexture(SC); screenTex.encoding = THREE.sRGBEncoding; screenTex.anisotropy = 8;
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.76, 1.55), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  screenMesh.position.set(0, 1.5, 0.007); monitor.add(screenMesh);

  let video = null, videoMesh = null;
  if (CONFIG.video) {
    video = document.createElement('video'); video.src = CONFIG.video; video.muted = true; video.loop = true; video.playsInline = true; video.setAttribute('playsinline', ''); video.crossOrigin = 'anonymous';
    const vt = new THREE.VideoTexture(video); vt.encoding = THREE.sRGBEncoding;
    videoMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.76, 1.55), new THREE.MeshBasicMaterial({ map: vt, toneMapped: false, transparent: true, opacity: 0 }));
    videoMesh.position.set(0, 1.5, 0.009); monitor.add(videoMesh);
  }

  const kbd = new THREE.Group(); kbd.position.set(1.0, 0.03, 0.85); scene.add(kbd);
  const kbBase = roundedBox(2.0, 0.66, 0.05, 0.05, mat({ color: 0x232126, roughness: 0.5, metalness: 0.4 })); kbBase.rotation.x = -Math.PI / 2; kbd.add(kbBase);
  const KCOLS = 14, KROWS = 4, KN = KCOLS * KROWS;
  const keys = new THREE.InstancedMesh(new THREE.BoxGeometry(0.11, 0.04, 0.11), mat({ color: 0xffffff, roughness: 0.5 }), KN);
  const keyEnergy = new Float32Array(KN), kM = new THREE.Matrix4(), kC = new THREE.Color();
  for (let r = 0; r < KROWS; r++) for (let c = 0; c < KCOLS; c++) {
    kM.setPosition(-0.877 + c * 0.135, 0.055, -0.2 + r * 0.13); keys.setMatrixAt(r * KCOLS + c, kM); keys.setColorAt(r * KCOLS + c, kC.set(0x2c292e));
  }
  keys.castShadow = true; kbd.add(keys);
  const space = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.1), mat({ color: 0x2c292e, roughness: 0.5 })); space.position.set(0, 0.055, 0.26); kbd.add(space);
  const mouse = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), mat({ color: 0x2c292e, roughness: 0.4, metalness: 0.3 })); mouse.scale.set(0.13, 0.055, 0.21); mouse.position.set(2.35, 0.05, 0.85); mouse.castShadow = true; scene.add(mouse);

  /* lamp */
  (function lamp() {
    const m = mat({ color: 0x1f1d1f, roughness: 0.35, metalness: 0.8 });
    const g = new THREE.Group(); scene.add(g);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.06, 40), m); b.position.set(3.7, 0.03, -0.7); b.castShadow = true; g.add(b);
    const p0 = new THREE.Vector3(3.7, 0.05, -0.7), p1 = new THREE.Vector3(3.5, 1.3, -0.55), p2 = new THREE.Vector3(3.05, 2.25, -0.3);
    g.add(limb(p0, p1, 0.028, m), limb(p1, p2, 0.028, m));
    const j = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), m); j.position.copy(p1); g.add(j);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.42, 36, 1, true), new THREE.MeshStandardMaterial({ color: 0x2a2320, roughness: 0.4, metalness: 0.7, side: THREE.DoubleSide }));
    cone.geometry.rotateX(-Math.PI / 2); cone.position.copy(p2).add(new THREE.Vector3(0, 0.05, 0)); cone.lookAt(new THREE.Vector3(2.5, 0, 0.5)); g.add(cone);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd9a8, toneMapped: false }));
    bulb.position.copy(p2).add(new THREE.Vector3(-0.06, -0.06, 0.1)); g.add(bulb);
  })();

  /* props: books + notebook */
  (function props() {
    const cols = [0x6b3a2a, 0x2f4257, 0x8a6a3c];
    let y = 0;
    cols.forEach((c, i) => {
      const h = 0.14 + i * 0.03, b = roundedBox(1.15 - i * 0.08, 0.8 - i * 0.03, h, 0.02, mat({ color: c, roughness: 0.75 }));
      b.rotation.x = -Math.PI / 2; b.rotation.z = 0.1 * (i - 1); b.position.set(-3.6, y + h / 2, -0.4 + i * 0.03); scene.add(b); y += h;
    });
    const nb = roundedBox(0.7, 0.94, 0.04, 0.03, mat({ color: 0x1f2a33, roughness: 0.7 })); nb.rotation.x = -Math.PI / 2; nb.rotation.z = -0.14; nb.position.set(2.85, 0.02, 0.15); scene.add(nb);

    /* small taped photos on the notebook cover */
    function makePolaroid(src, posX, posZ, rotZ, tapeRotZ, tapeX, tapeZ, yBase) {
      const pc = document.createElement('canvas'); pc.width = 300; pc.height = 340; const pxx = pc.getContext('2d');
      const tex = new THREE.CanvasTexture(pc); tex.encoding = THREE.sRGBEncoding;
      let img = null;
      function draw() {
        const b = 16; pxx.fillStyle = '#f6f1e6'; pxx.fillRect(0, 0, 300, 340);
        pxx.save(); rrect(pxx, b, b, 300 - b * 2, 340 - b * 2 - 40, 3); pxx.clip();
        if (img && img.complete && img.naturalWidth) {
          const iw = img.naturalWidth, ih = img.naturalHeight, s = Math.max((300 - b * 2) / iw, (340 - b * 2 - 40) / ih);
          pxx.drawImage(img, b + (300 - b * 2 - iw * s) / 2, b + (340 - b * 2 - 40 - ih * s) / 2, iw * s, ih * s);
        } else {
          const g = pxx.createLinearGradient(0, 0, 300, 300); g.addColorStop(0, '#7fd6ff'); g.addColorStop(1, '#ffab5c'); pxx.fillStyle = g; pxx.fillRect(b, b, 300 - b * 2, 340 - b * 2 - 40);
        }
        pxx.restore(); tex.needsUpdate = true;
      }
      if (src) { img = new Image(); img.crossOrigin = 'anonymous'; img.onload = draw; img.src = src; }
      draw();
      document.fonts.ready.then(draw);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.385), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
      mesh.rotation.x = -Math.PI / 2; mesh.rotation.z = rotZ; mesh.position.set(posX, yBase, posZ); mesh.castShadow = true; scene.add(mesh);
      const tape = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.06), new THREE.MeshStandardMaterial({ color: 0xe9e2c8, roughness: 0.8, transparent: true, opacity: 0.55 }));
      tape.rotation.x = -Math.PI / 2; tape.rotation.z = tapeRotZ; tape.position.set(tapeX, yBase + 0.001, tapeZ); scene.add(tape);
    }
    makePolaroid(CONFIG.photos.polaroid2 || CONFIG.photo, 2.52, -0.14, -0.17, -0.17 + 0.55, 2.45, -0.26, 0.05);
    makePolaroid(CONFIG.photos.polaroid || CONFIG.photo, 2.68, 0.02, 0.22, 0.22 - 0.6, 2.60, -0.11, 0.055);

    /* loose prints lying on top of the book stack (its top surface is at y ≈ 0.51).
       Each: (image, x, z, yaw, width, height). They stack up by a hair each so they never z-fight. */
    function deskPrint(src, px, pz, yaw, w, h, lift) {
      const cw = 460, chh = Math.round(cw * h / w), b = 14;
      const c = document.createElement('canvas'); c.width = cw; c.height = chh; const g = c.getContext('2d');
      const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
      let img = null;
      function draw() {
        g.fillStyle = '#f3eee3'; g.fillRect(0, 0, cw, chh);
        g.save(); g.beginPath(); g.rect(b, b, cw - b * 2, chh - b * 2); g.clip();
        if (img && img.complete && img.naturalWidth) {
          const iw = img.naturalWidth, ih = img.naturalHeight, k = Math.max((cw - b * 2) / iw, (chh - b * 2) / ih);
          g.drawImage(img, b + (cw - b * 2 - iw * k) / 2, b + (chh - b * 2 - ih * k) / 2, iw * k, ih * k);
        } else { g.fillStyle = '#3a2c24'; g.fillRect(b, b, cw - b * 2, chh - b * 2); }
        g.restore(); tex.needsUpdate = true;
      }
      if (src) { img = new Image(); img.crossOrigin = 'anonymous'; img.onload = draw; img.src = src; }
      draw();
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 }));
      m.rotation.x = -Math.PI / 2; m.rotation.z = yaw; m.position.set(px, 0.512 + lift, pz);
      m.castShadow = true; m.receiveShadow = true; scene.add(m);
    }
    (CONFIG.photos.desk || []).slice(0, 4).forEach((src, i) => {
      const spots = [[-3.78, -0.18, 0.55], [-3.52, -0.27, -0.25], [-3.70, -0.42, 0.12], [-3.46, -0.50, -0.6]];
      const [dx, dz, yaw] = spots[i];
      deskPrint(src, dx, dz, yaw, 0.46, 0.31, i * 0.0045);
    });
  })();

  /* standing desk photo frame */
  (function photoFrame() {
    const FW = 0.62, FH = 0.82, BORDER = 0.05;
    const fc = document.createElement('canvas'); fc.width = 420; fc.height = 560; const fx = fc.getContext('2d');
    const frameTex = new THREE.CanvasTexture(fc); frameTex.encoding = THREE.sRGBEncoding;
    let photoImg = null;
    function draw() {
      const W = fc.width, H = fc.height, b = 34;
      fx.fillStyle = '#0d0806'; fx.fillRect(0, 0, W, H);
      fx.save(); rrect(fx, b, b, W - b * 2, H - b * 2, 4); fx.clip();
      if (photoImg && photoImg.complete && photoImg.naturalWidth) {
        const iw = photoImg.naturalWidth, ih = photoImg.naturalHeight, s = Math.max((W - b * 2) / iw, (H - b * 2) / ih);
        fx.drawImage(photoImg, b + (W - b * 2 - iw * s) / 2, b + (H - b * 2 - ih * s) / 2, iw * s, ih * s);
      } else {
        const g = fx.createLinearGradient(0, b, 0, H - b); g.addColorStop(0, '#4a3324'); g.addColorStop(1, '#241914'); fx.fillStyle = g; fx.fillRect(b, b, W - b * 2, H - b * 2);
        fx.strokeStyle = 'rgba(242,223,196,.5)'; fx.lineWidth = 3;
        fx.beginPath(); const cx = W / 2, cy = b + (H - b * 2) * 0.42, r = 46;
        fx.arc(cx, cy, r, 0, 6.2832); fx.moveTo(cx - r * 1.15, cy + r * 1.5); fx.quadraticCurveTo(cx, cy + r * 0.55, cx + r * 1.15, cy + r * 1.5); fx.stroke();
      }
      fx.restore();
      frameTex.needsUpdate = true;
    }
    const src = CONFIG.photos.frame || CONFIG.photo;
    if (src) { photoImg = new Image(); photoImg.crossOrigin = 'anonymous'; photoImg.onload = draw; photoImg.src = src; }
    draw();
    document.fonts.ready.then(draw);
    const g = new THREE.Group();
    const back = roundedBox(FW + BORDER, FH + BORDER, 0.025, 0.03, mat({ color: 0x0d0806, roughness: 0.55 }));
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(FW, FH), new THREE.MeshBasicMaterial({ map: frameTex, toneMapped: false }));
    pic.position.z = 0.014; back.add(pic); back.castShadow = back.receiveShadow = true; g.add(back);
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.02), mat({ color: 0x241f1c, roughness: 0.6 }));
    stand.position.set(0, -FH / 2 + 0.02, -0.03); stand.rotation.x = -0.55; g.add(stand);
    g.position.set(-2.85, FH / 2 + 0.02, 0.55); g.rotation.y = 0.4; g.rotation.x = -0.05; g.castShadow = true;
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(g);
  })();

  /* =====================================================================
     Screen (editor + live preview)
     ===================================================================== */
  const CODE = [
    '// matin.js',
    'const developer = {',
    '  name: "Matin Movafagh",',
    '  role: "Frontend Developer",',
    '  from: "Electrical Engineering",',
    '  base: "Hamedan",',
    '  stack: ["JavaScript", "React"],',
    '  tools: ["Vite", "Tailwind"],',
    '  fuel: "coffee",',
    '};',
    '',
    'function build(idea) {',
    '  return idea',
    '    .map(detail => care(detail))',
    '    .filter(Boolean);',
    '}',
    '',
    'build("something people enjoy");',
  ];
  const KW = /^(const|function|return)$/;
  function tokenize(line) {
    const out = []; const re = /(\/\/.*$)|("(?:[^"\\]|\\.)*")|([A-Za-z_]\w*)(?=\s*:)|([A-Za-z_]\w*)(?=\()|([A-Za-z_]\w*)|(\s+)|(.)/g; let m;
    while ((m = re.exec(line))) {
      if (m[1]) out.push([m[1], '#5f7186']);
      else if (m[2]) out.push([m[2], '#a5e3ff']);
      else if (m[3]) out.push([m[3], '#f3dcc0']);
      else if (m[4]) out.push([m[4], KW.test(m[4]) ? '#ffab5c' : '#7fd6ff']);
      else if (m[5]) out.push([m[5], KW.test(m[5]) ? '#ffab5c' : '#dbe7f3']);
      else if (m[6]) out.push([m[6], '#dbe7f3']);
      else out.push([m[7], '#7f90a6']);
    }
    return out;
  }
  const TOK = CODE.map(tokenize);
  const TOTAL = CODE.reduce((n, l) => n + l.length + 1, 0);

  let avatar = null;
  const avatarSrc = CONFIG.photos.avatar || CONFIG.photo;
  if (avatarSrc) { avatar = new Image(); avatar.crossOrigin = 'anonymous'; avatar.onload = () => { lastKey = ''; }; avatar.src = avatarSrc; }

  const PROJECT_COLOR = { w1: '#ffab5c', w2: '#7fd6ff', w3: '#5ad07a' };
  let activeProject = null, zoomed = false;
  function setZoom(on) { zoomed = on; document.querySelector('.work .pin').classList.toggle('zoomed', on); }
  function clearProject() { activeProject = null; lastKey = ''; setZoom(false); $$('.row[data-p]').forEach(r => r.classList.remove('active')); }
  $$('.row[data-p]').forEach(row => {
    const pick = () => {
      if (activeProject === row.dataset.p) return;
      $$('.row[data-p]').forEach(r => r.classList.toggle('active', r === row));
      activeProject = row.dataset.p; lastKey = ''; setZoom(true);
    };
    row.addEventListener('click', pick);
    row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
  });
  const closeBtn = $('#screenClose'); if (closeBtn) closeBtn.addEventListener('click', clearProject);

  function rrect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
  function wrapText(x, text, cx, cy, maxWidth, lh, maxLines) {
    const words = text.split(' '); let line = '', n = 0;
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + ' ' + words[i] : words[i];
      if (x.measureText(test).width > maxWidth && line) {
        x.fillText(line, cx, cy + n * lh); line = words[i]; n++;
        if (n >= maxLines) return;
      } else line = test;
    }
    if (line) x.fillText(line, cx, cy + n * lh);
  }
  function drawProjectView(x, px, py, key) {
    const d = T[lang], col = PROJECT_COLOR[key] || '#ffab5c';
    x.direction = lang === 'fa' ? 'rtl' : 'ltr'; x.textAlign = lang === 'fa' ? 'right' : 'left';
    const tx0 = lang === 'fa' ? px + 460 : px;
    x.fillStyle = col + '2a'; rrect(x, px, py, 460, 138, 12); x.fill();
    const tags = (d[key + '.tags'] || '').split(' · ');
    let cy = py + 40; const g = x.createLinearGradient(px, py, px + 460, py); g.addColorStop(0, col); g.addColorStop(1, col + '55');
    x.fillStyle = g; x.fillRect(px, py, 6, 138);
    x.fillStyle = '#f7ebd9'; x.font = '700 27px "Vazirmatn", "Bricolage Grotesque", sans-serif';
    wrapText(x, d[key + '.t'], tx0, cy, 420, 32, 2); cy += 68;
    x.font = '600 16px "Vazirmatn", "Bricolage Grotesque", sans-serif'; x.fillStyle = col; x.fillText(d[key + '.s'], tx0, cy);
    x.textAlign = 'left'; x.direction = 'ltr';
    cy = py + 158; x.font = '17px "Vazirmatn", "Bricolage Grotesque", sans-serif'; x.fillStyle = '#c2ad95'; x.textAlign = lang === 'fa' ? 'right' : 'left';
    wrapText(x, paragraphs(d[key + '.d'])[0], tx0, cy, 460, 27, 3); cy += 100;
    x.textAlign = 'left'; x.direction = 'ltr';
    let cx = px; tags.forEach(t => { x.font = '600 16px ui-monospace, Menlo, Consolas, monospace'; const w = x.measureText(t).width + 24; x.fillStyle = '#ffffff14'; rrect(x, cx, cy, w, 32, 16); x.fill(); x.fillStyle = '#dbe7f3'; x.fillText(t, cx + 12, cy + 21); cx += w + 8; });
    /* placeholder browser window */
    const my = cy + 56, mw = 460, mh = 150;
    x.fillStyle = '#0b121a'; rrect(x, px, my, mw, mh, 10); x.fill();
    x.fillStyle = '#161c26'; x.fillRect(px, my, mw, 26);
    ['#ff6b5c', '#ffbd44', '#5ad07a'].forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.arc(px + 16 + i * 18, my + 13, 4, 0, 6.2832); x.fill(); });
    const bg = x.createLinearGradient(px, my + 26, px, my + mh); bg.addColorStop(0, col + '22'); bg.addColorStop(1, '#0b121a'); x.fillStyle = bg; x.fillRect(px + 1, my + 27, mw - 2, mh - 28);
    x.fillStyle = col + '55'; rrect(x, px + 20, my + 44, 130, 14, 4); x.fill();
    x.fillStyle = '#ffffff1f'; rrect(x, px + 20, my + 68, mw - 40, 10, 4); x.fill();
    rrect(x, px + 20, my + 86, mw - 90, 10, 4); x.fill();
    x.fillStyle = col + '99'; rrect(x, px + 20, my + 112, 100, 26, 13); x.fill();
  }
  const MONO = '26px ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';
  let lastKey = '';
  document.fonts.ready.then(() => { lastKey = ''; });
  function drawScreen(chars, blink) {
    const key = chars + ':' + blink + ':' + activeProject + ':' + lang; if (key === lastKey) return false; lastKey = key;
    const x = sx, W = 1280, H = 720;
    x.fillStyle = '#0d141d'; x.fillRect(0, 0, W, H);
    /* tab bar */
    x.fillStyle = '#0a1018'; x.fillRect(0, 0, W, 48);
    ['#ff6b5c', '#ffbd44', '#5ad07a'].forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.arc(28 + i * 26, 24, 7, 0, 6.2832); x.fill(); });
    x.fillStyle = '#0d141d'; rrect(x, 140, 10, 170, 38, 8); x.fill();
    x.fillStyle = '#dbe7f3'; x.font = '600 18px "Vazirmatn", "Bricolage Grotesque", sans-serif'; x.textBaseline = 'middle'; x.fillText('matin.js', 168, 30);
    x.fillStyle = '#ffab5c'; x.beginPath(); x.arc(154, 30, 4, 0, 6.2832); x.fill();
    /* gutter */
    x.fillStyle = '#0b121a'; x.fillRect(0, 48, 64, H - 48 - 30);
    /* code */
    x.font = MONO; x.textBaseline = 'alphabetic';
    const cw = x.measureText('M').width, lh = 33, top = 48 + 40;
    let left = chars, doneLines = 0, curLine = 0, curCol = 0;
    for (let i = 0; i < CODE.length; i++) {
      const y = top + i * lh;
      if (left <= 0 && i > 0) break;
      x.fillStyle = '#3b4a5c'; x.textAlign = 'right'; x.fillText(String(i + 1), 46, y);
      x.textAlign = 'left';
      const show = Math.min(left, CODE[i].length); let col = 0;
      for (const [txt, color] of TOK[i]) {
        if (col >= show) break; const part = txt.slice(0, show - col);
        x.fillStyle = color; x.fillText(part, 82 + col * cw, y); col += part.length;
      }
      curLine = i; curCol = show;
      if (left > CODE[i].length) doneLines = i + 1;
      left -= CODE[i].length + 1;
    }
    if (blink || chars < TOTAL) { x.fillStyle = '#ffab5c'; x.fillRect(82 + curCol * cw + 1, top + curLine * lh - 24, 3, 30); }
    /* preview pane */
    x.fillStyle = '#111b27'; x.fillRect(730, 48, W - 730, H - 48 - 30);
    x.fillStyle = '#0b121a'; rrect(x, 760, 76, 490, 36, 8); x.fill();
    x.fillStyle = '#5f7186'; x.font = '16px ui-monospace, Menlo, Consolas, monospace'; x.fillText(activeProject ? 'localhost:3000/work' : 'localhost:3000', 800, 100);
    const px = 790, py = 150;
    if (activeProject) {
      drawProjectView(x, px, py, activeProject);
    } else {
    /* avatar */
    const L0 = doneLines;
    if (L0 >= 3) { x.save(); x.beginPath(); x.arc(px + 46, py + 60, 46, 0, 6.2832); x.clip();
    if (avatar && avatar.complete && avatar.naturalWidth) { const s = Math.max(92 / avatar.naturalWidth, 92 / avatar.naturalHeight); x.drawImage(avatar, px + 46 - avatar.naturalWidth * s / 2, py + 60 - avatar.naturalHeight * s / 2, avatar.naturalWidth * s, avatar.naturalHeight * s); }
    else { const g = x.createLinearGradient(px, py, px + 92, py + 120); g.addColorStop(0, '#ffab5c'); g.addColorStop(1, '#7fd6ff'); x.fillStyle = g; x.fillRect(px, py, 92, 120); x.fillStyle = '#1a1310'; x.font = '700 34px "Vazirmatn", "Bricolage Grotesque", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('MM', px + 46, py + 62); x.textAlign = 'left'; }
    x.restore(); }
    x.textBaseline = 'alphabetic';
    const L = doneLines;
    x.globalAlpha = 1;
    if (L >= 3) { x.fillStyle = '#f7ebd9'; x.font = '700 40px "Vazirmatn", "Bricolage Grotesque", sans-serif'; x.fillText('Matin Movafagh', px + 112, py + 52); }
    if (L >= 4) { x.fillStyle = '#7fd6ff'; x.font = '500 24px "Vazirmatn", "Bricolage Grotesque", sans-serif'; x.fillText('Frontend Developer', px + 112, py + 88); }
    if (L >= 5) { x.fillStyle = '#c2ad95'; x.font = '20px "Vazirmatn", "Bricolage Grotesque", sans-serif'; x.fillText('Electrical Engineering background', px, py + 172); }
    if (L >= 6) { x.fillStyle = '#c2ad95'; x.fillText('Based in Hamedan', px, py + 204); }
    const chip = (t, cx, cy, col) => { x.font = '600 19px "Vazirmatn", "Bricolage Grotesque", sans-serif'; const w = x.measureText(t).width + 28; x.fillStyle = col + '33'; rrect(x, cx, cy, w, 36, 18); x.fill(); x.fillStyle = col; x.fillText(t, cx + 14, cy + 25); return w + 10; };
    if (L >= 7) { let cx = px; cx += chip('JavaScript', cx, py + 236, '#ffab5c'); chip('React', cx, py + 236, '#ffab5c'); }
    if (L >= 8) { let cx = px; cx += chip('Vite', cx, py + 284, '#7fd6ff'); chip('Tailwind', cx, py + 284, '#7fd6ff'); }
    if (L >= 9) { x.fillStyle = '#f3dcc0'; x.font = '600 22px "Vazirmatn", "Bricolage Grotesque", sans-serif'; x.fillText('Fuel: coffee', px + 34, py + 372); x.strokeStyle = '#ffab5c'; x.lineWidth = 3; x.beginPath(); x.moveTo(px + 2, py + 356); x.lineTo(px + 20, py + 356); x.lineTo(px + 18, py + 374); x.lineTo(px + 6, py + 374); x.closePath(); x.stroke(); x.beginPath(); x.arc(px + 21, py + 362, 5, -1.5, 1.5); x.stroke(); }
    if (L >= 18) { x.fillStyle = '#5ad07a22'; rrect(x, px, py + 410, 300, 40, 10); x.fill(); x.fillStyle = '#5ad07a'; x.font = '600 19px "Vazirmatn", "Bricolage Grotesque", sans-serif'; x.fillText('Built successfully', px + 16, py + 436); }
    }
    /* status bar */
    x.fillStyle = '#ffab5c'; x.fillRect(0, H - 30, W, 30);
    x.fillStyle = '#1a1310'; x.font = '600 15px "Vazirmatn", "Bricolage Grotesque", sans-serif'; x.textBaseline = 'middle'; x.fillText('JavaScript   ·   UTF-8   ·   Ln ' + (curLine + 1) + ', Col ' + (curCol + 1), 18, H - 15);
    x.textBaseline = 'alphabetic';
    return true;
  }
  drawScreen(0, 0);
  screenTex.needsUpdate = true;

  /* =====================================================================
     Camera path
     ===================================================================== */
  // [px,py,pz, lx,ly,lz, mirror(0/1), side(0/1)]
  const POSES = [
    [-1.2, 1.7, 6.6,    -0.9, 1.25, 1.1,  0, 0],   // hero: the cup, low in frame
    [-1.5, 1.9, 5.5,    -1.5, 1.3, 1.6,   0, 0],   // coffee: the sip
    [ 0.3, 2.2, 6.5,     0.9, 2.3, -0.3,  0, 0],   // code: swing to the monitor
    [ 0.9, 1.5, 5.2,    -0.7, 1.4, -0.5,  1, 1],   // about
    [ 2.6, 1.9, 4.8,     0.5, 1.35, -0.5,  1, 1],  // skills
    [ 1.0, 1.5, 2.3,     1.0, 1.5, -0.5,  0, 0],   // work: into the screen
    [ 2.0, 2.2, 7.6,     0.1, 1.0, 0.0,   1, 1],   // contact: normal wide desk view (phone dollies into close-up dynamically as it reveals)
  ];
  let posCurve, lookCurve, sideArr;
  const S = () => (lang === 'fa' ? -1 : 1);
  function buildCurves() {
    const s = S(), P = [], L = [];
    POSES.forEach(p => {
      const mx = (x) => (p[6] ? 1.0 + s * (x - 1.0) : x);
      P.push(new THREE.Vector3(mx(p[0]), p[1], p[2])); L.push(new THREE.Vector3(mx(p[3]), p[4], p[5]));
    });
    posCurve = new THREE.CatmullRomCurve3(P, false, 'catmullrom', 0.4);
    lookCurve = new THREE.CatmullRomCurve3(L, false, 'catmullrom', 0.4);
    sideArr = POSES.map(p => p[7]);
  }
  onLangChange = buildCurves; buildCurves();

  /* phone: contact card */
  let phoneGroup = null, phoneFlatPos, phoneUpPos, phoneFlatQuat, phoneUpQuat, phoneNormal, phoneUpVec;
  let phoneScreenPlane = null, phoneReveal = 0;
  const phoneCamPos = new THREE.Vector3(), _upScratch = new THREE.Vector3();
  const PHONE_CANVAS = { w: 340, h: 700 };
  const PHONE_SCALE = 2; // texture pixels per layout unit, keeps text sharp when the camera closes in
  // Link rows: drawn on the canvas and hit-tested from the same numbers.
  const PHONE_ROWS = [
    { key: 'l.linkedin', url: CONFIG.linkedin, sub: 'linkedin.com', color: '#0a66c2', glyph: 'in' },
    { key: 'l.github', url: CONFIG.github, sub: 'github.com', color: '#3d444d', glyph: '</>' },
    { key: 'l.instagram', url: CONFIG.instagram, sub: 'instagram.com', color: '#d6286f', glyph: '◎' },
    { key: 'l.telegram', url: CONFIG.telegram, sub: 't.me', color: '#2aabee', glyph: '➤' },
  ];
  const PHONE_ROW_TOP = 330, PHONE_ROW_H = 58, PHONE_ROW_STEP = 58, PHONE_ROW_X = 16, PHONE_ROW_X2 = PHONE_CANVAS.w - 16;
  const PHONE_CTA = { y: 614, h: 50, row: PHONE_ROWS.findIndex((r) => r.key === 'l.telegram') };
  const phonePos = new THREE.Vector3();
  (function contactPhone() {
    const PW = 0.34, PH = 0.7, PD = 0.032, R = 0.045;
    const bezel = mat({ color: 0x121012, roughness: 0.35, metalness: 0.35 });
    const body = roundedBox(PW, PH, PD, R, bezel);
    const pc = document.createElement('canvas');
    pc.width = PHONE_CANVAS.w * PHONE_SCALE; pc.height = PHONE_CANVAS.h * PHONE_SCALE;
    const px3 = pc.getContext('2d');
    const phoneTex = new THREE.CanvasTexture(pc); phoneTex.encoding = THREE.sRGBEncoding;
    phoneTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    // The glass follows the body's corner curve, inset by the bezel. A plain rectangle
    // pokes past the rounded corners of the body.
    const INSET = 0.01, sw = PW - INSET * 2, sh = PH - INSET * 2;
    const screenGeo = new THREE.ShapeGeometry(rrShape(sw, sh, R - INSET), 12);
    const sPos = screenGeo.attributes.position, sUv = screenGeo.attributes.uv;
    for (let i = 0; i < sPos.count; i++) sUv.setXY(i, sPos.getX(i) / sw, sPos.getY(i) / sh);
    screenGeo.translate(-sw / 2, -sh / 2, 0);
    const screenPlane = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ map: phoneTex, toneMapped: false }));
    screenPlane.position.z = PD / 2 + 0.001; body.add(screenPlane); phoneScreenPlane = screenPlane;

    let phoneAvatarImg = null;
    const phoneAvatarSrc = CONFIG.photos.phone || CONFIG.photo;
    if (phoneAvatarSrc) { phoneAvatarImg = new Image(); phoneAvatarImg.crossOrigin = 'anonymous'; phoneAvatarImg.onload = () => drawPhone(); phoneAvatarImg.src = phoneAvatarSrc; }

    function drawPhone() {
      const d = T[lang], W = PHONE_CANVAS.w, H = PHONE_CANVAS.h, x = px3;
      const FONT = '"Vazirmatn", "Bricolage Grotesque", sans-serif';
      x.setTransform(PHONE_SCALE, 0, 0, PHONE_SCALE, 0, 0);
      x.textAlign = 'left';

      x.fillStyle = '#0e1621'; x.fillRect(0, 0, W, H);
      const head = x.createLinearGradient(0, 0, 0, 310); head.addColorStop(0, '#27496d'); head.addColorStop(1, '#0e1621');
      x.fillStyle = head; x.fillRect(0, 0, W, 310);
      const glow = x.createRadialGradient(W / 2, 136, 10, W / 2, 136, 170); glow.addColorStop(0, 'rgba(106,179,243,.26)'); glow.addColorStop(1, 'rgba(106,179,243,0)');
      x.fillStyle = glow; x.fillRect(0, 0, W, 310);

      // status bar
      x.fillStyle = '#ffffff'; x.font = '600 15px ' + FONT; x.fillText('9:41', 26, 31);
      for (let i = 0; i < 4; i++) { const bh = 4 + i * 2.5; rrect(x, W - 88 + i * 5.5, 31 - bh, 3.4, bh, 1); x.fill(); }
      x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 1; rrect(x, W - 59, 20.5, 25, 11.5, 3.4); x.stroke();
      rrect(x, W - 57, 22.5, 18, 7.5, 2); x.fill();
      rrect(x, W - 33.5, 24, 2, 4.5, 1); x.fill();

      // navigation: back chevron, overflow dots
      x.strokeStyle = '#6ab3f3'; x.lineWidth = 2.6; x.lineCap = 'round'; x.lineJoin = 'round';
      x.beginPath(); x.moveTo(30, 54); x.lineTo(21, 63); x.lineTo(30, 72); x.stroke();
      x.fillStyle = '#6ab3f3';
      [W - 44, W - 34, W - 24].forEach((dx) => { x.beginPath(); x.arc(dx, 63, 2.2, 0, 6.2832); x.fill(); });

      // avatar
      const AV = { cx: W / 2, cy: 138, r: 48 };
      x.save(); x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 20; x.shadowOffsetY = 7;
      x.fillStyle = '#17212b'; x.beginPath(); x.arc(AV.cx, AV.cy, AV.r, 0, 6.2832); x.fill(); x.restore();
      x.save(); x.beginPath(); x.arc(AV.cx, AV.cy, AV.r, 0, 6.2832); x.clip();
      if (phoneAvatarImg && phoneAvatarImg.complete && phoneAvatarImg.naturalWidth) {
        const iw = phoneAvatarImg.naturalWidth, ih = phoneAvatarImg.naturalHeight, k = Math.max(AV.r * 2 / iw, AV.r * 2 / ih);
        x.drawImage(phoneAvatarImg, AV.cx - iw * k / 2, AV.cy - ih * k / 2, iw * k, ih * k);
      } else {
        const g2 = x.createLinearGradient(AV.cx - AV.r, AV.cy - AV.r, AV.cx + AV.r, AV.cy + AV.r); g2.addColorStop(0, '#ffab5c'); g2.addColorStop(1, '#7fd6ff');
        x.fillStyle = g2; x.fillRect(AV.cx - AV.r, AV.cy - AV.r, AV.r * 2, AV.r * 2);
        x.fillStyle = '#1a1310'; x.font = '700 28px ' + FONT; x.textAlign = 'center'; x.fillText('MM', AV.cx, AV.cy + 10); x.textAlign = 'left';
      }
      x.restore();
      x.strokeStyle = 'rgba(255,255,255,.2)'; x.lineWidth = 1.5; x.beginPath(); x.arc(AV.cx, AV.cy, AV.r, 0, 6.2832); x.stroke();

      // name and role
      x.textAlign = 'center';
      x.fillStyle = '#ffffff'; x.font = '700 23px ' + FONT; x.fillText('Matin Movafagh', W / 2, 223);
      x.fillStyle = '#6ab3f3'; x.font = '500 15px ' + FONT; x.fillText('Frontend Developer', W / 2, 247);
      x.textAlign = 'left';

      // links, grouped like a Telegram info card
      x.fillStyle = '#6ab3f3'; x.font = '600 13px ' + FONT; x.fillText(d['phone.info'], 28, 319);
      x.fillStyle = '#17212b'; rrect(x, PHONE_ROW_X, PHONE_ROW_TOP, PHONE_ROW_X2 - PHONE_ROW_X, PHONE_ROW_STEP * PHONE_ROWS.length, 16); x.fill();
      PHONE_ROWS.forEach((r, i) => {
        const ry = PHONE_ROW_TOP + i * PHONE_ROW_STEP;
        x.fillStyle = r.color; rrect(x, 30, ry + 12, 34, 34, 9); x.fill();
        x.fillStyle = '#ffffff'; x.font = '700 14px ' + FONT; x.textAlign = 'center'; x.fillText(r.glyph, 47, ry + 34); x.textAlign = 'left';
        x.fillStyle = '#f5f5f5'; x.font = '600 17px ' + FONT; x.fillText(d[r.key], 78, ry + 26);
        x.fillStyle = '#708499'; x.font = '13px ' + FONT; x.fillText(r.sub, 78, ry + 44);
        x.strokeStyle = '#4a5c70'; x.lineWidth = 2; x.beginPath(); x.moveTo(W - 34, ry + 23); x.lineTo(W - 28, ry + 29); x.lineTo(W - 34, ry + 35); x.stroke();
        if (i < PHONE_ROWS.length - 1) { x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(78, ry + PHONE_ROW_STEP - 0.5, PHONE_ROW_X2 - 78, 1); }
      });

      // call to action
      const cta = x.createLinearGradient(PHONE_ROW_X, 0, PHONE_ROW_X2, 0); cta.addColorStop(0, '#3a9ff5'); cta.addColorStop(1, '#2a80d8');
      x.fillStyle = cta; rrect(x, PHONE_ROW_X, PHONE_CTA.y, PHONE_ROW_X2 - PHONE_ROW_X, PHONE_CTA.h, 14); x.fill();
      x.fillStyle = '#ffffff'; x.font = '700 17px ' + FONT; x.textAlign = 'center'; x.fillText(d['phone.cta'], W / 2, PHONE_CTA.y + 31); x.textAlign = 'left';

      x.fillStyle = 'rgba(255,255,255,.4)'; rrect(x, (W - 110) / 2, H - 16, 110, 4, 2); x.fill();
      phoneTex.needsUpdate = true;
    }
    drawPhone();
    document.fonts.ready.then(drawPhone);
    const phoneChain = onLangChange; onLangChange = () => { phoneChain(); drawPhone(); };

    const group = new THREE.Group(); group.add(body);
    phoneFlatPos = new THREE.Vector3(0.4, PD / 2 + 0.001, 1.6);
    phoneUpPos = new THREE.Vector3(0.4, PH / 2 + 0.02, 1.95);
    const qLie = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    const qSpin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.3);
    phoneFlatQuat = qSpin.multiply(qLie);
    phoneUpQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.34, -0.09, 0));
    phoneNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(phoneUpQuat);
    phoneUpVec = new THREE.Vector3(0, 1, 0).applyQuaternion(phoneUpQuat);
    group.position.copy(phoneFlatPos); group.quaternion.copy(phoneFlatQuat);
    group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(group); phoneGroup = group;
  })();

  /* sizing */
  let W = 0, H = 0, aspect = 1, needsRender = true;
  let boxW = 0, boxH = 0;
  function steamScale() { steamU.uScale.value = (H * renderer.getPixelRatio()) / (2 * Math.tan(camera.fov * Math.PI / 360)); }
  function resize() {
    // The canvas is sized in CSS with the large viewport unit, so it keeps its size when a
    // phone's address bar slides in and out. Resizing the drawing buffer on every scroll
    // gesture was a major source of stutter.
    const box = renderer.domElement.getBoundingClientRect();
    const w = Math.round(box.width) || innerWidth, h = Math.round(box.height) || innerHeight;
    if (w !== boxW || h !== boxH) {
      boxW = w; boxH = h; W = w; H = h; aspect = W / H;
      renderer.setSize(W, H, false); camera.aspect = aspect;
      camera.fov = aspect < 0.8 ? 52 : 40; camera.updateProjectionMatrix();
      steamScale(); needsRender = true;
    }
    measure();
  }
  addEventListener('resize', resize);
  resize();

  // A language switch redraws the screens; make sure the next frame is drawn.
  const langBefore = onLangChange; onLangChange = () => { langBefore(); needsRender = true; };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  addEventListener('load', measure);

  /* input */
  let mx = 0, my = 0, smx = 0, smy = 0;
  if (!coarse && !reduceMotion) addEventListener('pointermove', e => { mx = e.clientX / innerWidth * 2 - 1; my = e.clientY / innerHeight * 2 - 1; }, { passive: true });

  /* phone screen hit-testing (tap a row to open the real link) */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function hitTestPhone(clientX, clientY) {
    if (!phoneScreenPlane || phoneReveal < 0.6) return -1;
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObject(phoneScreenPlane, false)[0];
    if (!hit || !hit.uv) return -1;
    const px = hit.uv.x * PHONE_CANVAS.w, py = (1 - hit.uv.y) * PHONE_CANVAS.h;
    if (px < PHONE_ROW_X || px > PHONE_ROW_X2) return -1;
    for (let i = 0; i < PHONE_ROWS.length; i++) {
      const ry = PHONE_ROW_TOP + i * PHONE_ROW_STEP;
      if (py >= ry && py <= ry + PHONE_ROW_H) return i;
    }
    if (py >= PHONE_CTA.y && py <= PHONE_CTA.y + PHONE_CTA.h) return PHONE_CTA.row;
    return -1;
  }
  document.addEventListener('click', e => {
    const i = hitTestPhone(e.clientX, e.clientY);
    if (i >= 0 && PHONE_ROWS[i].url) window.open(PHONE_ROWS[i].url, '_blank', 'noopener');
  });
  if (!coarse) addEventListener('pointermove', e => {
    document.body.style.cursor = hitTestPhone(e.clientX, e.clientY) >= 0 ? 'pointer' : '';
  }, { passive: true });

  /* state */
  const tmpP = new THREE.Vector3(), tmpL = new THREE.Vector3(), colA = new THREE.Color();
  const zoomP = new THREE.Vector3(), zoomL = new THREE.Vector3();
  const AMBER = new THREE.Color(0xffab5c), CYAN = new THREE.Color(0x7fd6ff), accentC = new THREE.Color();
  let su = 0, zoomT = 0, lastAccent = '', prevType = 0, last = performance.now(), typeAcc = 0, firstFrame = true;
  let lastSig = '', lastRender = 0, lastScreenDraw = 0, lastSip = -1, lastReveal = -1;
  let perfSum = 0, perfCount = 0;
  const WORK_INDEX = POSES.length - 2;
  const contactPinEl = document.querySelector('.contact .pin');

  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const target = scrollU();
    su += (target - su) * (1 - Math.exp(-dt * (reduceMotion ? 18 : 5.5)));
    if (Math.abs(target - su) < 0.0004) su = target;
    const u = su, t = now / 1000;
    updateText();
    if (zoomed && Math.abs(u - WORK_INDEX) > 1.3) clearProject();

    /* camera */
    const k = Math.min(1, Math.max(0, u / (N - 1)));
    posCurve.getPoint(k, tmpP); lookCurve.getPoint(k, tmpL);
    const i0 = Math.min(N - 1, Math.floor(u)), i1 = Math.min(N - 1, i0 + 1);
    const side = lerp(sideArr[i0], sideArr[i1], u - i0);
    const portrait = Math.min(1, Math.max(0, (0.95 - aspect) / 0.45));
    if (portrait > 0) {
      const wide = 1 + portrait * (0.35 + (1 - side) * 0.15);
      tmpP.sub(tmpL).multiplyScalar(wide).add(tmpL);
      tmpL.x += (MON.x - tmpL.x) * portrait * side;
      tmpL.y -= 0.85 * portrait * side; tmpP.y -= 0.85 * portrait * side;
    }
    const zoomTarget = zoomed ? 1 : 0;
    zoomT += (zoomTarget - zoomT) * (1 - Math.exp(-dt * (reduceMotion ? 10 : 3.4)));
    if (Math.abs(zoomTarget - zoomT) < 0.0015) zoomT = zoomTarget;
    if (zoomT > 0.0015) {
      const vHalf = Math.tan(camera.fov * Math.PI / 360), hHalf = vHalf * camera.aspect;
      // Distance at which the whole screen is visible. The larger of the two fits is needed:
      // taking the smaller one cropped the monitor to a sliver on tall phone screens.
      const d = Math.max(1.55 / 2 / vHalf, 2.76 / 2 / hHalf) * 1.04;
      // On tall screens the project card sits under the monitor, so lift the monitor
      // into the upper part of the view.
      const lift = camera.aspect < 0.8 ? 0.16 * 2 * vHalf * d : 0;
      zoomL.set(MON.x, 1.5 - lift, MON.z + 0.007); zoomP.set(MON.x, 1.5 - lift, MON.z + 0.007 + d);
      tmpP.lerp(zoomP, zoomT); tmpL.lerp(zoomL, zoomT);
    }
    const reveal = phoneGroup ? smooth(5.2, 5.95, u) : 0;
    phoneReveal = reveal;
    if (contactPinEl) contactPinEl.classList.toggle('phone-focus', reveal > 0.55);
    if (reveal > 0.0015) {
      const vHalf = Math.tan(camera.fov * Math.PI / 360);
      const d = 0.35 / (0.7 * vHalf); // dolly in until the phone fills ~70% of the viewport height
      phoneCamPos.copy(phoneUpPos).addScaledVector(phoneNormal, d);
      tmpP.lerp(phoneCamPos, reveal); tmpL.lerp(phoneUpPos, reveal);
    }
    smx += (mx - smx) * (1 - Math.exp(-dt * 3)); smy += (my - smy) * (1 - Math.exp(-dt * 3));
    const pk = (1 - zoomT) * (1 - reveal);
    camera.position.set(tmpP.x + smx * 0.28 * pk, tmpP.y - smy * 0.14 * pk, tmpP.z);
    _upScratch.set(0, 1, 0).lerp(phoneUpVec || _upScratch, reveal).normalize();
    camera.up.copy(_upScratch);
    camera.lookAt(tmpL);

    /* story beats */
    if (phoneGroup) {
      phonePos.lerpVectors(phoneFlatPos, phoneUpPos, reveal);
      phoneGroup.position.copy(phonePos);
      phoneGroup.quaternion.copy(phoneFlatQuat).slerp(phoneUpQuat, reveal);
    }
    const sip = smooth(0.3, 1.0, u) * (1 - smooth(1.0, 1.7, u));
    const level = 1 - 0.72 * smooth(0.55, 1.0, u);
    cup.position.set(CUP_BASE.x, CUP_BASE.y + sip * 0.7, CUP_BASE.z + sip * 0.6);
    saucer.position.set(CUP_BASE.x, 0, CUP_BASE.z);
    cup.rotation.x = sip * 0.55;
    const cy = 0.13 + 0.42 * level, cr = 0.30 + (cy - 0.1) * 0.134;
    coffee.position.y = cy; coffee.scale.setScalar(cr); coffee.rotation.x = -Math.PI / 2;

    const steamAmt = (1 - smooth(0.25, 1.0, u)) + 0.16 * (1 - smooth(1.2, 2.2, u));
    steamU.uAmt.value = steamAmt; steamU.uTime.value = reduceMotion ? 3 : t;
    steam.position.set(cup.position.x, cup.position.y + cy + 0.02, cup.position.z);
    steam.visible = steamAmt > 0.01;

    const cool = smooth(1.3, 2.7, u);
    lampSpot.intensity = lerp(2.7, 1.25, cool);
    cupLight.intensity = lerp(2.5, 0.55, cool);
    rim.intensity = lerp(0.25, 0.6, cool);
    screenLight.intensity = 0.15 + cool * 2.3;
    scene.background.copy(WARM_BG).lerp(COOL_BG, cool); scene.fog.color.copy(scene.background);
    renderer.toneMappingExposure = 1.15;

    /* accent color follows the story: amber -> cyan */
    accentC.copy(AMBER).lerp(CYAN, Math.round(cool * 24) / 24);
    const hex = '#' + accentC.getHexString();
    if (hex !== lastAccent) { root.style.setProperty('--accent', hex); lastAccent = hex; }

    /* typing */
    const typeP = smooth(1.75, 2.75, u);
    const chars = Math.floor(typeP * TOTAL);
    const dType = Math.abs(typeP - prevType); prevType = typeP;
    typeAcc += dType * 260;
    while (typeAcc > 1) { typeAcc -= 1; keyEnergy[(Math.random() * KN) | 0] = 1; }
    let keyDirty = false;
    for (let i = 0; i < KN; i++) {
      if (keyEnergy[i] > 0) { keyEnergy[i] = Math.max(0, keyEnergy[i] - dt * 5); keyDirty = true; }
      if (keyDirty || firstFrame) { colA.set(0x2c292e).lerp(CYAN, keyEnergy[i]); keys.setColorAt(i, colA); }
    }
    if (keyDirty || firstFrame) keys.instanceColor.needsUpdate = true;
    const blink = typeP >= 1 ? ((t * 1.6) | 0) % 2 : 0;
    let changed = false;
    // While text is being typed the 1280x720 screen is redrawn and re-uploaded; 30 times a second is plenty.
    if (chars === 0 || chars >= TOTAL || now - lastScreenDraw > 33) {
      if (drawScreen(chars, blink)) { screenTex.needsUpdate = true; lastScreenDraw = now; changed = true; }
    }
    if (keyDirty) changed = true;

    /* video on the monitor while reading About */
    if (video) {
      const vm = smooth(2.6, 3.0, u) * (1 - smooth(4.0, 4.6, u));
      videoMesh.material.opacity = vm; videoMesh.visible = vm > 0.01;
      if (vm > 0.01 && video.paused) video.play().catch(() => {});
      if (vm <= 0.01 && !video.paused) video.pause();
      if (vm > 0.01) changed = true;
    }

    const cp = camera.position;
    const sig = su.toFixed(5) + cp.x.toFixed(4) + cp.y.toFixed(4) + cp.z.toFixed(4) + tmpL.x.toFixed(4) + tmpL.y.toFixed(4) + tmpL.z.toFixed(4) + reveal.toFixed(4) + zoomT.toFixed(4);
    if (sig !== lastSig) { lastSig = sig; changed = true; }
    if (steam.visible) changed = true;
    if (changed) needsRender = true;

    // Idle frames (nothing moving) are skipped; one frame every 250 ms still catches late image loads.
    if (needsRender || now - lastRender > 250) {
      if (firstFrame || Math.abs(sip - lastSip) > 1e-4 || Math.abs(reveal - lastReveal) > 1e-4) {
        renderer.shadowMap.needsUpdate = true; lastSip = sip; lastReveal = reveal;
      }
      const gap = now - lastRender;
      renderer.render(scene, camera);
      lastRender = now; needsRender = false;

      // Adaptive resolution: only if sustained animation drops under ~25 fps, shave a little off.
      if (changed && gap < 100) {
        perfSum += gap; perfCount++;
        if (perfCount >= 45) {
          const avg = perfSum / perfCount; perfSum = perfCount = 0;
          const ratio = renderer.getPixelRatio();
          if (avg > 40 && ratio > MIN_RATIO) { renderer.setPixelRatio(Math.max(MIN_RATIO, ratio - 0.125)); steamScale(); }
        }
      }
    }
    if (firstFrame) { firstFrame = false; requestAnimationFrame(() => root.classList.add('ready')); }
  }
  requestAnimationFrame(frame);
}

measure(); updateText();
addEventListener('resize', () => { measure(); updateText(); });
start3D();
// If 3D never starts, still reveal the page and keep the text layer synced to scroll.
setTimeout(() => { if (!root.classList.contains('ready')) root.classList.add('ready'); }, 4000);
if (root.classList.contains('no-webgl')) { (function loop() { updateText(); requestAnimationFrame(loop); })(); }

function setLang(l) {
  lang = l;
  if (typeof onLangChange === 'function') onLangChange();
}

return { setLang };
}