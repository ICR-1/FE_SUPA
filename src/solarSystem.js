import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/* =====================================================================
   Noise 3D (Perlin) dengan seed tetap → tekstur sama setiap dimuat,
   dan dipetakan di permukaan bola sehingga tidak ada sambungan/kerut kutub.
   ===================================================================== */
const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const makeNoise = (seed) => {
  const rnd = mulberry32(seed);
  const p = new Uint8Array(512);
  const perm = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (t, a, b) => a + t * (b - a);
  const grad = (h, x, y, z) => {
    h &= 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  };
  return (x, y, z) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z;
    const B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
    return lerp(w,
      lerp(v, lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)),
              lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))),
      lerp(v, lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)),
              lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1))));
  };
};

const noise3 = makeNoise(20260);
const fbm = (x, y, z, oct = 5) => {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) {
    v += a * noise3(x * f, y * f, z * f);
    f *= 2.02; a *= 0.5;
  }
  return v; // ± ~0.8
};

const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mixInto = (o, a, b, t) => {
  o[0] = a[0] + (b[0] - a[0]) * t;
  o[1] = a[1] + (b[1] - a[1]) * t;
  o[2] = a[2] + (b[2] - a[2]) * t;
};
const palette = (stops, t, o) => {
  const n = stops.length - 1;
  const x = clamp01(t) * n;
  const i = Math.min(n - 1, Math.floor(x));
  mixInto(o, stops[i], stops[i + 1], x - i);
};

// Gambar tekstur ekuirektangular: fn(px,py,pz,lat,lon,out) mengisi out=[r,g,b,(a)]
const paintSphere = (w, h, fn, alpha = false) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h);
  const out = [0, 0, 0, 255];
  for (let y = 0; y < h; y++) {
    const lat = (0.5 - (y + 0.5) / h) * Math.PI;
    const cl = Math.cos(lat), sl = Math.sin(lat);
    for (let x = 0; x < w; x++) {
      const lon = ((x + 0.5) / w) * Math.PI * 2;
      out[3] = 255;
      fn(cl * Math.cos(lon), sl, cl * Math.sin(lon), lat, lon, out);
      const i = (y * w + x) * 4;
      img.data[i] = out[0]; img.data[i + 1] = out[1]; img.data[i + 2] = out[2];
      img.data[i + 3] = alpha ? out[3] : 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
};

const wrapPi = (d) => { while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

/* ----------------------- Resep tekstur per planet ----------------------- */
const recipes = {
  mercury: () => {
    const dark = hex(0x4d4843), base = hex(0x8f8982), tmp = [0, 0, 0];
    return paintSphere(512, 256, (x, y, z, lat, lon, o) => {
      const n = fbm(x * 3.2, y * 3.2, z * 3.2, 5);
      const fine = fbm(x * 12 + 5, y * 12, z * 12, 3);
      mixInto(o, dark, base, clamp01(0.55 + n * 1.1 + fine * 0.35));
      const c = fbm(x * 16 + 3, y * 16 + 3, z * 16, 2);
      if (c > 0.28) { // kawah terang
        const k = smooth(0.28, 0.5, c) * 0.35;
        mixInto(o, o.slice(), [210, 205, 198], k);
      }
      void tmp;
    });
  },
  venus: () => {
    const stops = [hex(0xc8964e), hex(0xe2bb78), hex(0xf0d9a0), hex(0xd9a965)];
    return paintSphere(512, 256, (x, y, z, lat, lon, o) => {
      const q = fbm(x * 1.6, y * 3.5, z * 1.6, 3);
      const n = fbm(x * 2.2 + q * 1.6, y * 6 + q * 2.4, z * 2.2 + q * 1.6, 4);
      palette(stops, 0.5 + n * 1.1, o);
    });
  },
  earth: () => {
    const deep = hex(0x07285e), shallow = hex(0x1f6aa8);
    const green = hex(0x2f7a35), forest = hex(0x1d5a2a), sand = hex(0xc4a560), rock = hex(0x8b7a58), snow = hex(0xf2f6f8);
    return paintSphere(1024, 512, (x, y, z, lat, lon, o) => {
      const e = fbm(x * 1.7 + 7, y * 1.7, z * 1.7, 6);
      const al = Math.abs(lat);
      if (e < 0.02) {
        mixInto(o, deep, shallow, smooth(-0.18, 0.02, e));
      } else {
        const moist = fbm(x * 3 + 20, y * 3, z * 3, 4);
        const hot = 1 - smooth(0.2, 1.05, al);
        mixInto(o, green, forest, smooth(-0.1, 0.2, moist));
        mixInto(o, o.slice(), sand, smooth(0.0, 0.2, -moist - 0.05) * hot);
        mixInto(o, o.slice(), rock, smooth(0.22, 0.4, e));
        mixInto(o, o.slice(), snow, smooth(0.38, 0.5, e) * 0.9);
      }
      const ice = 1.2 + 0.14 * fbm(x * 5, y * 5, z * 5, 3);
      mixInto(o, o.slice(), snow, smooth(ice - 0.04, ice + 0.04, al));
    });
  },
  earthClouds: () =>
    paintSphere(1024, 512, (x, y, z, lat, lon, o) => {
      const n = fbm(x * 2.6 + 40, y * 3.6, z * 2.6, 5) + 0.12 * fbm(x * 8, y * 8, z * 8, 2);
      o[0] = 255; o[1] = 255; o[2] = 255;
      o[3] = 255 * smooth(0.02, 0.38, n) * 0.92;
    }, true),
  mars: () => {
    const dark = hex(0x6b3825), base = hex(0xb9582f), light = hex(0xd88a58), snow = hex(0xf1ece6);
    return paintSphere(512, 256, (x, y, z, lat, lon, o) => {
      const n = fbm(x * 2.1, y * 2.1, z * 2.1, 5);
      mixInto(o, dark, base, smooth(-0.15, 0.22, n));
      mixInto(o, o.slice(), light, smooth(0.25, 0.5, fbm(x * 5 + 9, y * 5, z * 5, 3)) * 0.6);
      const f = fbm(x * 14, y * 14, z * 14, 2) * 0.12;
      o[0] *= 1 + f; o[1] *= 1 + f; o[2] *= 1 + f;
      mixInto(o, o.slice(), snow, smooth(1.38 + 0.05 * n, 1.46 + 0.05 * n, Math.abs(lat)));
    });
  },
  jupiter: () => {
    const stops = [hex(0xf0e4cb), hex(0xd8b88a), hex(0xb77f52), hex(0xe9d3a9), hex(0xa06f46), hex(0xdcc196)];
    const red = hex(0xb23d28);
    return paintSphere(1024, 512, (x, y, z, lat, lon, o) => {
      const warp = fbm(x * 3, y * 1.2, z * 3, 4) * 1.3;
      const s = Math.sin(lat * 10.5 + warp) * 0.5 + 0.5;
      palette(stops, s + fbm(x * 6, y * 42, z * 6, 3) * 0.16, o);
      // Bintik Merah Besar
      const dx = wrapPi(lon - 3.7) * Math.cos(lat) / 0.3;
      const dy = (lat + 0.42) / 0.15;
      const d = Math.hypot(dx, dy);
      if (d < 1.15) {
        const sw = fbm(x * 9, y * 14, z * 9, 3);
        mixInto(o, o.slice(), red, Math.pow(clamp01(1.1 - d), 0.55) * (0.8 + sw * 0.5));
        if (d > 0.88) mixInto(o, o.slice(), [240, 225, 200], (d - 0.88) * 1.2);
      }
    });
  },
  saturn: () => {
    const stops = [hex(0xe8d7a6), hex(0xcdb27c), hex(0xdfc995), hex(0xb89c66), hex(0xe3cf9f)];
    return paintSphere(512, 256, (x, y, z, lat, lon, o) => {
      const warp = fbm(x * 2.2, y * 0.8, z * 2.2, 3) * 0.7;
      const s = Math.sin(lat * 15 + warp) * 0.5 + 0.5;
      palette(stops, s + fbm(x * 5, y * 30, z * 5, 3) * 0.1, o);
    });
  },
  uranus: () => {
    const a = hex(0x8fd0d6), b = hex(0xb4e6ea);
    return paintSphere(512, 256, (x, y, z, lat, lon, o) => {
      const s = Math.sin(lat * 7 + fbm(x * 2, y * 1, z * 2, 3)) * 0.5 + 0.5;
      mixInto(o, a, b, s * 0.8 + fbm(x * 4, y * 8, z * 4, 3) * 0.12);
    });
  },
  neptune: () => {
    const a = hex(0x2a49c4), b = hex(0x4a78ee), spot = hex(0x15268a);
    return paintSphere(512, 256, (x, y, z, lat, lon, o) => {
      const s = Math.sin(lat * 9 + fbm(x * 2.5, y * 1.2, z * 2.5, 4) * 1.4) * 0.5 + 0.5;
      mixInto(o, a, b, s * 0.85);
      const dx = wrapPi(lon - 1.3) * Math.cos(lat) / 0.28, dy = (lat + 0.4) / 0.14;
      const d = Math.hypot(dx, dy);
      if (d < 1) mixInto(o, o.slice(), spot, Math.pow(1 - d, 0.6) * 0.85);
      const c = smooth(0.42, 0.62, fbm(x * 3 + 9, y * 12, z * 3, 3));
      mixInto(o, o.slice(), [225, 235, 255], c * 0.55);
    });
  },
};

// Cincin Saturnus: 1 dimensi (jari-jari) → alpha/warna
const ringTexture = () => {
  const w = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = 4;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, 4);
  for (let x = 0; x < w; x++) {
    const t = x / (w - 1); // 0 = tepi dalam
    let a = 0;
    if (t < 0.16) a = 0.12 + 0.1 * t / 0.16;               // cincin D/C redup
    else if (t < 0.5) a = 0.78 + 0.16 * Math.sin(t * 90);   // cincin B terang
    else if (t < 0.57) a = 0.04;                             // celah Cassini
    else if (t < 0.93) a = 0.6 + 0.12 * Math.sin(t * 130);   // cincin A
    else a = 0.08;
    if (t > 0.85 && t < 0.865) a *= 0.15;                    // celah Encke
    a *= 0.82 + 0.18 * noise3(t * 70, 1.3, 0.7);
    const shade = 170 + 70 * (0.5 + 0.5 * noise3(t * 40, 3.1, 2.2));
    for (let y = 0; y < 4; y++) {
      const i = (y * w + x) * 4;
      img.data[i] = shade; img.data[i + 1] = shade * 0.92; img.data[i + 2] = shade * 0.78;
      img.data[i + 3] = clamp01(a) * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

const glowTexture = (inner = 'rgba(255,230,160,1)', mid = 'rgba(255,150,40,0.35)') => {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.25, mid);
  grad.addColorStop(1, 'rgba(255,120,20,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

const dotTexture = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.8)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
};

/* ----------------------------- Shader ----------------------------- */
const sunMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec3 vPos; varying vec3 vN;
      void main(){ vPos = position; vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float uTime; varying vec3 vPos; varying vec3 vN;
      float hash(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float noise(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
      float fbm(vec3 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=.5; } return v; }
      void main(){
        vec3 p = normalize(vPos) * 2.4; float t = uTime * 0.06;
        float n = fbm(p + vec3(t, t*.7, -t));
        float m = fbm(p*2.6 - vec3(t*1.4) + n*1.6);
        float heat = clamp(n*.55 + m*.65, 0., 1.);
        vec3 c1 = vec3(.78,.22,.03), c2 = vec3(1.0,.58,.1), c3 = vec3(1.0,.93,.6);
        vec3 col = mix(c1, c2, smoothstep(.25,.6,heat));
        col = mix(col, c3, smoothstep(.62,.92,heat));
        float ndv = max(dot(normalize(vN), vec3(0.,0.,1.)), 0.);
        col *= 0.62 + 0.55 * ndv;
        gl_FragColor = vec4(col * 1.35, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });

const atmosphereMaterial = (color, power = 3.2, strength = 1.0) =>
  new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uPower: { value: power }, uStrength: { value: strength } },
    vertexShader: `
      varying vec3 vN; varying float vLit;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vec3 wn = normalize(mat3(modelMatrix) * normal);
        vec3 toSun = normalize(-modelMatrix[3].xyz);
        vLit = clamp(dot(wn, toSun) * 0.9 + 0.35, 0.0, 1.0);
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uPower; uniform float uStrength; varying vec3 vN; varying float vLit;
      void main(){
        float i = pow(max(0.72 - dot(vN, vec3(0.,0.,1.)), 0.), uPower);
        gl_FragColor = vec4(uColor, 1.0) * i * vLit * uStrength * 1.1;
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });

/* ----------------------------- Data planet ----------------------------- */
// speed = rad/detik (dipercepat agar planet luar tidak terlihat diam), ecc = eksentrisitas (dilebihkan sedikit)
const PLANETS = [
  { key: 'mercury', name: 'Merkurius', radius: 0.8, a: 8, ecc: 0.2, inc: 7, tilt: 0.03, spin: 0.35, atmos: null,
    info: { diameter: '4.879 km', jarak: '57,9 juta km', tahun: '88 hari', bulan: '0' } },
  { key: 'venus', name: 'Venus', radius: 1.5, a: 14, ecc: 0.03, inc: 3.4, tilt: 3.1, spin: -0.08, atmos: [0xffc46a, 3.0, 0.9],
    info: { diameter: '12.104 km', jarak: '108,2 juta km', tahun: '225 hari', bulan: '0' } },
  { key: 'earth', name: 'Bumi', radius: 1.6, a: 20, ecc: 0.035, inc: 0, tilt: 0.41, spin: 0.7, atmos: [0x58a6ff, 3.6, 1.2],
    info: { diameter: '12.742 km', jarak: '149,6 juta km', tahun: '365 hari', bulan: '1' } },
  { key: 'mars', name: 'Mars', radius: 1.2, a: 25.5, ecc: 0.1, inc: 1.9, tilt: 0.44, spin: 0.68, atmos: [0xff8a5c, 4.5, 0.55],
    info: { diameter: '6.779 km', jarak: '227,9 juta km', tahun: '687 hari', bulan: '2' } },
  { key: 'jupiter', name: 'Jupiter', radius: 3.0, a: 33, ecc: 0.05, inc: 1.3, tilt: 0.05, spin: 1.6, atmos: null,
    info: { diameter: '139.820 km', jarak: '778,5 juta km', tahun: '11,9 tahun', bulan: '90+' } },
  { key: 'saturn', name: 'Saturnus', radius: 2.5, a: 41, ecc: 0.06, inc: 2.5, tilt: 0.47, spin: 1.4, atmos: null, rings: true,
    info: { diameter: '116.460 km', jarak: '1.434 juta km', tahun: '29,5 tahun', bulan: '140+' } },
  { key: 'uranus', name: 'Uranus', radius: 1.8, a: 48, ecc: 0.05, inc: 0.8, tilt: 1.7, spin: -0.9, atmos: [0x8fe9ee, 3.4, 0.8], rings: 'thin',
    info: { diameter: '50.724 km', jarak: '2.871 juta km', tahun: '84 tahun', bulan: '28' } },
  { key: 'neptune', name: 'Neptunus', radius: 1.7, a: 55, ecc: 0.02, inc: 1.8, tilt: 0.49, spin: 0.95, atmos: [0x4f7bff, 3.4, 1.0],
    info: { diameter: '49.244 km', jarak: '4.495 juta km', tahun: '165 tahun', bulan: '16' } },
];
const SUN_INFO = { name: 'Matahari', info: { diameter: '1.392.700 km', jarak: '—', tahun: '—', bulan: '—' } };
const omegaOf = (a) => 0.2 * Math.pow(7 / a, 1.15);

export const initSolarSystem = (container) => {
  if (!container) return;
  const mobile = window.innerWidth <= 768;
  const setHeight = () => { container.style.height = window.innerWidth <= 768 ? '420px' : '640px'; };
  setHeight();

  /* ---------- Renderer, scene, kamera ---------- */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02030a);
  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 2000);
  const OVERVIEW = new THREE.Vector3(0, 36, 62);
  const START = new THREE.Vector3(0, 90, 170); // mulai jauh, terbang masuk saat terlihat
  camera.position.copy(START);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';

  let composer = null;
  if (!mobile) {
    composer = new EffectComposer(renderer);
    composer.setPixelRatio(dpr);
    composer.setSize(container.clientWidth, container.clientHeight);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(container.clientWidth, container.clientHeight), 0.4, 0.6, 0.92));
    composer.addPass(new OutputPass());
  }

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.8;
  controls.enablePan = false;
  controls.minDistance = 6;
  controls.maxDistance = 150;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.35;
  controls.maxPolarAngle = Math.PI * 0.92;
  // Di layar sentuh, geser vertikal tetap menggulung halaman
  if (mobile) renderer.domElement.style.touchAction = 'pan-y';
  renderer.domElement.addEventListener('wheel', () => { interacted = true; }, { passive: true });

  /* ---------- Cahaya ---------- */
  scene.add(new THREE.AmbientLight(0x22305a, 1.4));
  const sunLight = new THREE.PointLight(0xfff0d8, 95, 0, 1.15);
  scene.add(sunLight);

  /* ---------- Bintang latar (3 lapis, berkedip halus) ---------- */
  const starTex = dotTexture();
  const starLayers = [];
  const makeStars = (count, size, opacity) => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const tints = [[1, 1, 1], [0.75, 0.85, 1], [1, 0.9, 0.75]];
    for (let i = 0; i < count; i++) {
      const r = 350 + Math.random() * 450;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph);
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      const t = tints[(Math.random() * 3) | 0], b = 0.6 + Math.random() * 0.4;
      col[i * 3] = t[0] * b; col[i * 3 + 1] = t[1] * b; col[i * 3 + 2] = t[2] * b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.PointsMaterial({
      size, map: starTex, vertexColors: true, transparent: true, opacity, depthWrite: false,
      sizeAttenuation: false, blending: THREE.AdditiveBlending,
    });
    const p = new THREE.Points(g, m);
    scene.add(p);
    starLayers.push({ p, base: opacity, phase: Math.random() * 6 });
  };
  makeStars(mobile ? 700 : 1600, 2.2, 0.9);
  makeStars(mobile ? 200 : 500, 3.6, 0.85);
  makeStars(mobile ? 40 : 120, 6, 0.8);

  /* ---------- Matahari ---------- */
  const sunMat = sunMaterial();
  const sun = new THREE.Mesh(new THREE.SphereGeometry(5, 64, 64), sunMat);
  scene.add(sun);
  const glowA = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.5,
  }));
  glowA.scale.set(20, 20, 1);
  const glowB = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture('rgba(255,200,120,0.5)', 'rgba(255,120,30,0.14)'),
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.32,
  }));
  glowB.scale.set(46, 46, 1);
  sun.add(glowA, glowB);

  /* ---------- Planet ---------- */
  const bodies = []; // { data, group(orbit), pivot(posisi), mesh, tiltGroup, M, hit }
  const planetMaterials = {};

  PLANETS.forEach((d, idx) => {
    const orbitGroup = new THREE.Group(); // kemiringan orbit
    orbitGroup.rotation.x = THREE.MathUtils.degToRad(d.inc);
    orbitGroup.rotation.y = idx * 0.9;
    scene.add(orbitGroup);

    // Garis orbit elips (matahari di salah satu fokus)
    const b = d.a * Math.sqrt(1 - d.ecc * d.ecc);
    const pts = [];
    for (let i = 0; i <= 256; i++) {
      const E = (i / 256) * Math.PI * 2;
      pts.push(new THREE.Vector3(d.a * (Math.cos(E) - d.ecc), 0, b * Math.sin(E)));
    }
    const orbitLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0x8fa3d9, transparent: true, opacity: 0.22 })
    );
    orbitGroup.add(orbitLine);

    const pivot = new THREE.Group(); // posisi di orbit
    orbitGroup.add(pivot);

    const tiltGroup = new THREE.Group(); // kemiringan sumbu
    tiltGroup.rotation.z = d.tilt;
    pivot.add(tiltGroup);

    const mat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.85, metalness: 0.0 });
    planetMaterials[d.key] = mat;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(d.radius, 64, 48), mat);
    tiltGroup.add(mesh);

    if (d.atmos) {
      const atm = new THREE.Mesh(new THREE.SphereGeometry(d.radius * 1.14, 48, 32), atmosphereMaterial(d.atmos[0], d.atmos[1], d.atmos[2]));
      pivot.add(atm);
    }

    let clouds = null;
    if (d.key === 'earth') {
      clouds = new THREE.Mesh(
        new THREE.SphereGeometry(d.radius * 1.015, 64, 48),
        new THREE.MeshStandardMaterial({ transparent: true, roughness: 1, depthWrite: false, opacity: 1 })
      );
      tiltGroup.add(clouds);
    }

    let moonPivot = null, moon = null;
    if (d.key === 'earth') {
      moonPivot = new THREE.Group();
      moonPivot.rotation.x = THREE.MathUtils.degToRad(5);
      pivot.add(moonPivot);
      moon = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 32, 24),
        new THREE.MeshStandardMaterial({ color: 0xb9b6b0, roughness: 1 })
      );
      moon.position.x = 3.4;
      moonPivot.add(moon);
    }

    if (d.rings) {
      const thin = d.rings === 'thin';
      const inner = d.radius * (thin ? 1.55 : 1.3), outer = d.radius * (thin ? 1.95 : 2.45);
      const rg = new THREE.RingGeometry(inner, outer, 160, 1);
      const uv = rg.attributes.uv, pos = rg.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const r = Math.hypot(pos.getX(i), pos.getY(i));
        uv.setXY(i, (r - inner) / (outer - inner), 0.5);
      }
      const rm = new THREE.MeshBasicMaterial({
        map: thin ? null : ringTexture(), color: thin ? 0x9fb4b8 : 0xffffff,
        transparent: true, opacity: thin ? 0.35 : 0.95, side: THREE.DoubleSide, depthWrite: false,
      });
      const ring = new THREE.Mesh(rg, rm);
      ring.rotation.x = -Math.PI / 2;
      tiltGroup.add(ring); // tidak ikut berputar bersama planet
    }

    bodies.push({
      data: d, orbitGroup, orbitLine, pivot, tiltGroup, mesh, clouds, moonPivot, moon,
      b, M: idx * 2.2, omega: omegaOf(d.a), hitR: Math.max(d.radius * 1.5, 1.6),
    });
  });

  // Tekstur dibuat bertahap supaya tidak memblokir halaman
  const jobs = [
    ['mercury', 'mercury'], ['venus', 'venus'], ['earth', 'earth'], ['mars', 'mars'],
    ['jupiter', 'jupiter'], ['saturn', 'saturn'], ['uranus', 'uranus'], ['neptune', 'neptune'],
  ];
  let jobIdx = 0;
  const nextJob = () => {
    if (jobIdx >= jobs.length) return;
    const [key, recipe] = jobs[jobIdx++];
    const tex = recipes[recipe]();
    const mat = planetMaterials[key];
    mat.map = tex; mat.color.set(0xffffff); mat.needsUpdate = true;
    if (key === 'earth') {
      const b = bodies.find((x) => x.data.key === 'earth');
      b.clouds.material.map = recipes.earthClouds();
      b.clouds.material.needsUpdate = true;
      mat.roughness = 0.7;
    }
    setTimeout(nextJob, 30);
  };
  setTimeout(nextJob, 200);

  /* ---------- Sabuk asteroid ---------- */
  const beltCount = mobile ? 600 : 1800;
  const belt = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.11, 0),
    new THREE.MeshStandardMaterial({ color: 0x8f8579, roughness: 1, flatShading: true }),
    beltCount
  );
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i < beltCount; i++) {
    const r = 28.2 + (Math.random() + Math.random() - 1) * 2.2;
    const th = Math.random() * Math.PI * 2;
    v.set(Math.cos(th) * r, (Math.random() - 0.5) * 0.9 * (1 + Math.random()), Math.sin(th) * r);
    e.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    q.setFromEuler(e);
    const sc = 0.5 + Math.pow(Math.random(), 3) * 1.8;
    s.set(sc, sc * (0.7 + Math.random() * 0.5), sc);
    m4.compose(v, q, s);
    belt.setMatrixAt(i, m4);
  }
  scene.add(belt);

  /* ---------- UI: label, toolbar, panel info ---------- */
  const labelLayer = document.createElement('div');
  labelLayer.className = 'solar-labels';
  container.appendChild(labelLayer);
  const labelEls = bodies.map((b) => {
    const el = document.createElement('div');
    el.className = 'solar-label';
    el.textContent = b.data.name;
    labelLayer.appendChild(el);
    return el;
  });
  const sunLabel = document.createElement('div');
  sunLabel.className = 'solar-label';
  sunLabel.textContent = 'Matahari';
  labelLayer.appendChild(sunLabel);

  const toolbar = document.createElement('div');
  toolbar.className = 'solar-toolbar';
  toolbar.innerHTML = `
    <button type="button" data-act="play" aria-label="Jeda atau putar">Jeda</button>
    <button type="button" data-act="speed" aria-label="Ubah kecepatan">1×</button>
    <button type="button" data-act="orbits" aria-label="Tampilkan orbit" class="on">Orbit</button>
    <button type="button" data-act="reset" aria-label="Reset tampilan">Reset</button>`;
  container.appendChild(toolbar);

  const panel = document.createElement('div');
  panel.className = 'solar-panel';
  panel.innerHTML = `
    <button type="button" class="solar-panel-close" aria-label="Tutup">×</button>
    <h4 class="solar-panel-title"></h4>
    <dl>
      <dt>Diameter</dt><dd data-k="diameter"></dd>
      <dt>Jarak dari Matahari</dt><dd data-k="jarak"></dd>
      <dt>Lama 1 tahun</dt><dd data-k="tahun"></dd>
      <dt>Jumlah bulan</dt><dd data-k="bulan"></dd>
    </dl>`;
  container.appendChild(panel);

  const hint = document.createElement('div');
  hint.className = 'interaction-helper';
  hint.innerHTML = `<span>Seret untuk memutar · Klik planet untuk detail</span>`;
  container.appendChild(hint);
  const hideHint = () => { hint.classList.add('fadeout'); setTimeout(() => { hint.style.display = 'none'; }, 800); };

  /* ---------- State & interaksi ---------- */
  let paused = false;
  let speedIdx = 0;
  const SPEEDS = [1, 2, 4, 10];
  let showOrbits = true;
  let focusBody = null; // null = overview, 'sun', atau body
  let transition = 1;   // 0..1 saat berpindah fokus (1 = tidak sedang berpindah)
  const goal = { dist: 0, from: new THREE.Vector3(), fromTarget: new THREE.Vector3(), dir: new THREE.Vector3() };
  const tmp = new THREE.Vector3(), lastPos = new THREE.Vector3();
  let intro = 0, introStarted = false, interacted = false;
  let hovered = null;

  const worldPosOf = (obj, out) => obj.getWorldPosition(out);

  const showPanel = (name, info) => {
    panel.querySelector('.solar-panel-title').textContent = name;
    panel.querySelectorAll('dd').forEach((dd) => { dd.textContent = info[dd.dataset.k]; });
    panel.classList.add('open');
  };

  const focusOn = (target) => {
    controls.autoRotate = false;
    interacted = true;
    focusBody = target;
    transition = 0;
    goal.from.copy(camera.position);
    goal.fromTarget.copy(controls.target);
    if (target === 'sun') {
      goal.dist = 22;
      showPanel(SUN_INFO.name, SUN_INFO.info);
      lastPos.set(0, 0, 0);
    } else if (target) {
      goal.dist = target.data.radius * 5 + 5;
      showPanel(target.data.name, target.data.info);
      worldPosOf(target.pivot, lastPos);
    }
    goal.dir.copy(camera.position).sub(controls.target).normalize();
  };

  const resetView = () => {
    focusBody = null;
    panel.classList.remove('open');
    transition = 0;
    goal.from.copy(camera.position);
    goal.fromTarget.copy(controls.target);
  };

  toolbar.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'play') { paused = !paused; btn.textContent = paused ? 'Putar' : 'Jeda'; }
    if (act === 'speed') { speedIdx = (speedIdx + 1) % SPEEDS.length; btn.textContent = `${SPEEDS[speedIdx]}×`; }
    if (act === 'orbits') { showOrbits = !showOrbits; btn.classList.toggle('on', showOrbits); bodies.forEach((b) => { b.orbitLine.visible = showOrbits; }); }
    if (act === 'reset') resetView();
  });
  panel.querySelector('.solar-panel-close').addEventListener('click', resetView);

  // Pilih benda dengan sinar → bola (cukup akurat & murah)
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pointerPos = { x: 0, y: 0, down: false, moved: 0, sx: 0, sy: 0 };
  const setNdc = (cx, cy) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  };
  const sphere = new THREE.Sphere();
  const pick = () => {
    let best = null, bestD = Infinity;
    const test = (center, radius, ref) => {
      sphere.set(center, radius);
      if (ray.ray.intersectSphere(sphere, tmp)) {
        const d = tmp.distanceTo(ray.ray.origin);
        if (d < bestD) { bestD = d; best = ref; }
      }
    };
    test(new THREE.Vector3(0, 0, 0), 5.2, 'sun');
    bodies.forEach((b) => test(worldPosOf(b.pivot, new THREE.Vector3()), b.hitR, b));
    return best;
  };

  renderer.domElement.addEventListener('pointerdown', (e) => {
    pointerPos.down = true; pointerPos.sx = e.clientX; pointerPos.sy = e.clientY; pointerPos.moved = 0;
    controls.autoRotate = false;
    interacted = true;
    hideHint();
  });
  window.addEventListener('pointerup', (e) => {
    if (!pointerPos.down) return;
    pointerPos.down = false;
    if (pointerPos.moved < 6 && e.target === renderer.domElement) {
      setNdc(e.clientX, e.clientY);
      const hit = pick();
      if (hit) focusOn(hit);
    }
  });
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (pointerPos.down) pointerPos.moved = Math.max(pointerPos.moved, Math.hypot(e.clientX - pointerPos.sx, e.clientY - pointerPos.sy));
    pointerPos.x = e.clientX; pointerPos.y = e.clientY;
  });
  renderer.domElement.addEventListener('pointerleave', () => { hovered = null; renderer.domElement.style.cursor = ''; });

  /* ---------- Resize & visibilitas ---------- */
  const onResize = () => {
    setHeight();
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (composer) composer.setSize(w, h);
  };
  new ResizeObserver(onResize).observe(container);
  window.addEventListener('resize', onResize);

  let visible = false;
  new IntersectionObserver((en) => {
    visible = en[0].isIntersecting;
    if (visible && !introStarted) introStarted = true;
  }, { threshold: 0.15 }).observe(container);

  /* ---------- Loop ---------- */
  const clock = new THREE.Clock();
  const proj = new THREE.Vector3();
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  const solveKepler = (M, ecc) => {
    let E = M;
    for (let i = 0; i < 5; i++) E = E - (E - ecc * Math.sin(E) - M) / (1 - ecc * Math.cos(E));
    return E;
  };

  const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const pxRadius = (worldPos, radius) =>
    (radius / (Math.max(0.01, camera.position.distanceTo(worldPos)) * tanHalf)) * (container.clientHeight / 2);
  const place = (el, worldPos, yOffset, active) => {
    proj.copy(worldPos).project(camera);
    const behind = proj.z > 1;
    const x = (proj.x * 0.5 + 0.5) * container.clientWidth;
    const y = (-proj.y * 0.5 + 0.5) * container.clientHeight;
    el.style.transform = `translate(${x.toFixed(1)}px, ${(y - yOffset).toFixed(1)}px) translate(-50%, -100%)`;
    el.style.opacity = behind ? 0 : '';
    el.classList.toggle('active', !!active);
  };

  const animate = () => {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!visible) return;
    const t = clock.elapsedTime;
    const sim = paused ? 0 : dt * SPEEDS[speedIdx];

    // terbang masuk saat pertama terlihat
    if (introStarted && intro < 1) {
      intro = Math.min(1, intro + dt / 2.8);
      if (!interacted) camera.position.lerpVectors(START, OVERVIEW, easeOut(intro));
    }

    sunMat.uniforms.uTime.value = t;
    sun.rotation.y += sim * 0.03;
    sunLight.intensity = 95 + Math.sin(t * 1.7) * 2;

    bodies.forEach((b) => {
      const d = b.data;
      b.M += b.omega * sim; // anomali rata-rata konstan → kecepatan sudut sebenarnya lebih besar di dekat matahari
      const E = solveKepler(b.M, d.ecc);
      const x = d.a * (Math.cos(E) - d.ecc);
      const z = b.b * Math.sin(E);
      b.pivot.position.set(x, 0, z);
      b.mesh.rotation.y += d.spin * sim * 0.6;
      if (b.clouds) b.clouds.rotation.y += (d.spin * 0.75 + 0.05) * sim * 0.6;
      if (b.moonPivot) b.moonPivot.rotation.y += 0.9 * sim;
    });
    belt.rotation.y += 0.004 * sim;
    starLayers.forEach((l, i) => { l.p.material.opacity = l.base * (0.78 + 0.22 * Math.sin(t * (0.7 + i * 0.4) + l.phase)); });
    starLayers.forEach((l) => { l.p.rotation.y += 0.00003; });

    // fokus kamera
    if (focusBody || transition < 1) {
      if (focusBody) {
        const pos = focusBody === 'sun' ? tmp.set(0, 0, 0) : worldPosOf(focusBody.pivot, tmp);
        if (transition < 1) {
          transition = Math.min(1, transition + dt / 1.3);
          const k = easeOut(transition);
          controls.target.lerpVectors(goal.fromTarget, pos, k);
          const off = goal.from.clone().sub(goal.fromTarget);
          const len = THREE.MathUtils.lerp(off.length(), goal.dist, k);
          camera.position.copy(controls.target).add(off.normalize().multiplyScalar(len));
        } else {
          // ikuti planet yang bergerak
          const delta = pos.clone().sub(lastPos);
          controls.target.add(delta);
          camera.position.add(delta);
        }
        lastPos.copy(pos);
      } else {
        // kembali ke overview
        transition = Math.min(1, transition + dt / 1.4);
        const k = easeOut(transition);
        controls.target.lerpVectors(goal.fromTarget, new THREE.Vector3(0, 0, 0), k);
        camera.position.lerpVectors(goal.from, OVERVIEW, k);
        if (transition >= 1) controls.autoRotate = false;
      }
    }
    controls.update();

    // hover
    if (!pointerPos.down && pointerPos.x) {
      setNdc(pointerPos.x, pointerPos.y);
      const r = renderer.domElement.getBoundingClientRect();
      const inside = pointerPos.x >= r.left && pointerPos.x <= r.right && pointerPos.y >= r.top && pointerPos.y <= r.bottom;
      hovered = inside ? pick() : null;
      renderer.domElement.style.cursor = hovered ? 'pointer' : '';
    }

    // label
    bodies.forEach((b, i) => {
      worldPosOf(b.pivot, tmp);
      place(labelEls[i], tmp, pxRadius(tmp, b.data.radius) + 8, hovered === b || focusBody === b);
    });
    place(sunLabel, tmp.set(0, 0, 0), pxRadius(tmp, 5) + 8, hovered === 'sun' || focusBody === 'sun');

    if (composer) composer.render(); else renderer.render(scene, camera);
  };
  animate();
};
