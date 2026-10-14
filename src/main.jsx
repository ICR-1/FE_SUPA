import './style.css';
import './modern.css';
import { initEffects } from './effects';
import { initSolarSystem } from './solarSystem';
import { supabase } from './lib/supabase';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import SkillsSection from './components/SkillsSection';
import PortfolioSection from './components/PortfolioSection';
import AboutSection from './components/AboutSection';
import { expect as expectReady, whenDataReady } from './utils/readiness';

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

// Selalu mulai dari atas saat halaman dimuat ulang / dibuka kembali
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (location.hash) history.replaceState(null, '', location.pathname + location.search);
window.scrollTo(0, 0);
window.addEventListener('load', () => window.scrollTo(0, 0));
window.addEventListener('pageshow', (e) => { if (e.persisted) window.scrollTo(0, 0); });

// Initialize Three.js scene for background
const initBackgroundScene = () => {
  const canvas = document.querySelector('#canvas-container');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
  canvas.appendChild(renderer.domElement);

  // Add stars
  const particlesGeometry = new THREE.BufferGeometry();
  const particlesCount = window.innerWidth < 768 ? 1000 : 2000; // Further reduced

  const posArray = new Float32Array(particlesCount * 3);
  const colorsArray = new Float32Array(particlesCount * 3);

  const colorPalette = [
    new THREE.Color(0xaaa6c3),
    new THREE.Color(0x8a86a3),
    new THREE.Color(0x7a76b3),
    new THREE.Color(0x4c6ef5),
  ];

  for (let i = 0; i < particlesCount; i++) {
    posArray[i * 3] = (Math.random() - 0.5) * 10;
    posArray[i * 3 + 1] = (Math.random() - 0.5) * 10;
    posArray[i * 3 + 2] = (Math.random() - 0.5) * 10;

    const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    colorsArray[i * 3] = color.r;
    colorsArray[i * 3 + 1] = color.g;
    colorsArray[i * 3 + 2] = color.b;
  }

  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));

  const particlesMaterial = new THREE.PointsMaterial({
    size: 0.015,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true
  });

  const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
  scene.add(particlesMesh);

  const shapes = [];
  const shapeGroup = new THREE.Group();
  scene.add(shapeGroup);

  const createShape = () => {
    const geometries = [
      new THREE.TetrahedronGeometry(0.3, 0),
      new THREE.OctahedronGeometry(0.3, 0),
      new THREE.IcosahedronGeometry(0.3, 0),
      new THREE.TorusGeometry(0.3, 0.1, 16, 32)
    ];

    const geometry = geometries[Math.floor(Math.random() * geometries.length)];
    const material = new THREE.MeshStandardMaterial({
      color: colorPalette[Math.floor(Math.random() * colorPalette.length)].getHex(),
      wireframe: Math.random() > 0.5,
      transparent: true,
      opacity: 0.7,
      metalness: 0.3,
      roughness: 0.8
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

    mesh.userData = {
      rotationSpeed: {
        x: (Math.random() - 0.5) * 0.01,
        y: (Math.random() - 0.5) * 0.01,
        z: (Math.random() - 0.5) * 0.01
      },
      floatSpeed: 0.005 + Math.random() * 0.005,
      floatDistance: 0.2 + Math.random() * 0.3,
      initialY: mesh.position.y,
      floatOffset: Math.random() * Math.PI * 2
    };

    shapes.push(mesh);
    shapeGroup.add(mesh);
  };

  const shapeCount = window.innerWidth < 768 ? 3 : 6;
  for (let i = 0; i < shapeCount; i++) {
    createShape();
  }

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const pointLight = new THREE.PointLight(0xffffff, 0.8);
  pointLight.position.set(2, 3, 4);
  scene.add(pointLight);
  const directionalLight = new THREE.DirectionalLight(0x4c6ef5, 0.5);
  directionalLight.position.set(-5, 2, 2);
  scene.add(directionalLight);

  camera.position.z = 4;

  let mouseX = 0, mouseY = 0;
  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  const handleResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', handleResize);

  let time = 0;
  let isVisible = true;
  const observer = new IntersectionObserver((entries) => {
    isVisible = entries[0].isIntersecting;
  }, { threshold: 0.01 });
  observer.observe(canvas);

  const animate = () => {
    requestAnimationFrame(animate);
    if (!isVisible) return;

    time += 0.01;
    particlesMesh.rotation.y += 0.0003;
    particlesMesh.rotation.x += mouseY * 0.0003;
    particlesMesh.rotation.y += mouseX * 0.0003;

    shapes.forEach(shape => {
      shape.rotation.x += shape.userData.rotationSpeed.x;
      shape.rotation.y += shape.userData.rotationSpeed.y;
      shape.rotation.z += shape.userData.rotationSpeed.z;
      shape.position.y = shape.userData.initialY + Math.sin(time + shape.userData.floatOffset) * shape.userData.floatDistance;
    });

    shapeGroup.rotation.y = Math.sin(time * 0.1) * 0.1;
    renderer.render(scene, camera);
  };

  animate();

  return { scene, camera, renderer };
};

// Tata surya 3D (modul terpisah: src/solarSystem.js)
const init3DModelScene = () => initSolarSystem(document.getElementById('model-container'));

// Scroll animations with GSAP
const initScrollAnimations = () => {
  // Animasi hero dijalankan oleh playHeroIntro() setelah preloader selesai

  // About section animations with more advanced effects
  ScrollTrigger.batch('.about-card', {
    onEnter: (elements) => {
      gsap.to(elements, {
        opacity: 1,
        y: 0,
        stagger: 0.2,
        duration: 1,
        ease: "power3.out"
      });
    },
    start: 'top 80%'
  });

  ScrollTrigger.batch('.about-image', {
    onEnter: (elements) => {
      gsap.to(elements, {
        opacity: 1,
        scale: 1,
        duration: 1.2,
        ease: "elastic.out(1, 0.5)",
        delay: 0.3
      });

      // Add subtle floating animation after appearing
      gsap.to(elements, {
        y: -15,
        duration: 2,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        delay: 1.5
      });
    },
    start: 'top 80%'
  });

  // Skills section animations
  if (document.querySelector('.skills-title')) {
    gsap.to('.skills-title', {
      scrollTrigger: {
        trigger: '.skills-title',
        start: 'top 80%'
      },
      opacity: 1,
      y: 0,
      duration: 1,
      ease: "power2.out"
    });
  }

  // More dynamic skill cards animation
  ScrollTrigger.batch('.skill-card', {
    onEnter: (elements) => {
      // Reset any inline styles
      gsap.set(elements, {
        clearProps: "all"
      });

      // Main animation
      gsap.fromTo(elements,
        {
          opacity: 0,
          y: 50,
          scale: 0.8,
          rotationY: 30
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          rotationY: 0,
          stagger: 0.1,
          duration: 0.8,
          ease: "back.out(1.5)"
        }
      );

      // Add hover effect
      elements.forEach(card => {
        card.addEventListener('mouseenter', () => {
          gsap.to(card, {
            y: -10,
            scale: 1.05,
            duration: 0.4,
            ease: "power1.out"
          });

          // Find the image inside and animate it
          const img = card.querySelector('img');
          if (img) {
            gsap.to(img, {
              rotation: 360,
              duration: 0.8,
              ease: "power1.inOut"
            });
          }
        });

        card.addEventListener('mouseleave', () => {
          gsap.to(card, {
            y: 0,
            scale: 1,
            duration: 0.4,
            ease: "power1.out"
          });
        });
      });
    },
    start: 'top 85%'
  });

  // 3D model section animations
  gsap.to('.model-title', {
    scrollTrigger: {
      trigger: '.model-title',
      start: 'top 80%'
    },
    opacity: 1,
    duration: 1,
    y: 0,
    ease: "power2.out",
    onComplete: () => {
      // Animate Indonesia time after title animation completes
      gsap.to('#indonesia-time', {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power2.out"
      });
    }
  });

  gsap.to('#model-container', {
    scrollTrigger: {
      trigger: '#model-container',
      start: 'top 80%'
    },
    opacity: 1,
    scale: 1,
    duration: 1.2,
    ease: "power3.out"
  });

  gsap.to('.model-description', {
    scrollTrigger: {
      trigger: '.model-description',
      start: 'top 90%'
    },
    opacity: 1,
    y: 0,
    duration: 1,
    ease: "power1.out"
  });

  // Portfolio gallery animations
  if (document.querySelector('.gallery-title')) {
    gsap.to('.gallery-title', {
      scrollTrigger: {
        trigger: '.gallery-title',
        start: 'top 80%'
      },
      opacity: 1,
      y: 0,
      duration: 1,
      ease: "power2.out"
    });
  }

  ScrollTrigger.batch('.portfolio-item', {
    onEnter: (elements) => {
      gsap.fromTo(elements,
        {
          opacity: 0,
          y: 50,
          scale: 0.9
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          stagger: 0.15,
          duration: 0.8,
          ease: "back.out(1.2)"
        }
      );
    },
    start: 'top 85%'
  });

  // Contact section animations
  gsap.to('.contact-title', {
    scrollTrigger: {
      trigger: '.contact-title',
      start: 'top 80%'
    },
    opacity: 1,
    y: 0,
    duration: 1,
    ease: "power2.out"
  });

  gsap.to('.contact-form', {
    scrollTrigger: {
      trigger: '.contact-form',
      start: 'top 80%'
    },
    opacity: 1,
    y: 0,
    duration: 1,
    delay: 0.3,
    ease: "power2.out"
  });

  // Add parallax effect to background
  if (window.innerWidth > 768) {
    document.querySelectorAll('section').forEach(section => {
      gsap.to(section, {
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.5
        },
        y: (i, target) => -50 * (1 - target.dataset.speed || 0.2),
        ease: "none"
      });
    });
  }
};

// Smooth scrolling for navigation
const initSmoothScroll = () => {
  const heroButton = document.getElementById('hero-button');
  if (heroButton) {
    heroButton.addEventListener('click', () => {
      const aboutSection = document.querySelector('section:nth-of-type(2)');
      aboutSection.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Add subtle nav indicator highlighting current section
  const sections = document.querySelectorAll('section');

  const updateNavIndicator = () => {
    const scrollPosition = window.scrollY + window.innerHeight / 3;

    sections.forEach((section, index) => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;

      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        // We'd update a nav indicator here if we had one
        section.classList.add('active-section');
      } else {
        section.classList.remove('active-section');
      }
    });
  };

  window.addEventListener('scroll', updateNavIndicator);
};

// Make a dynamic cursor for desktop users
const initCustomCursor = () => {
  // Skip cursor creation for mobile devices
  if (window.innerWidth <= 768 || 'ontouchstart' in window || navigator.maxTouchPoints > 0) return;

  const cursor = document.createElement('div');
  cursor.classList.add('custom-cursor');
  document.body.appendChild(cursor);

  // Ganti dengan direct positioning tanpa gsap animation untuk mengurangi delay
  const moveCursor = (e) => {
    // Gunakan direct style manipulation daripada gsap animation
    cursor.style.left = `${e.clientX}px`;
    cursor.style.top = `${e.clientY}px`;
  };

  window.addEventListener('mousemove', moveCursor);

  // Change cursor style on hover over interactive elements
  const interactiveElements = document.querySelectorAll('button, .skill-card, #model-container, a, input, textarea, .social-link, .portfolio-item, .view-button');

  interactiveElements.forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('cursor-hover');
    });

    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('cursor-hover');
    });
  });
};

// Initialize preloader
// ============ INTRO: preloader + animasi hero ============
const splitHeroTitle = () => {
  const el = document.querySelector('#hero-title > span');
  if (!el || el.dataset.split) return [];
  const text = el.textContent;
  el.dataset.split = '1';
  el.setAttribute('aria-label', text);
  el.textContent = '';
  const chars = [];
  [...text].forEach((ch) => {
    if (ch === ' ') {
      const sp = document.createElement('span');
      sp.className = 'hero-char-space';
      el.appendChild(sp);
      return;
    }
    const mask = document.createElement('span');
    mask.className = 'hero-char-mask';
    mask.setAttribute('aria-hidden', 'true');
    const c = document.createElement('span');
    c.className = 'hero-char';
    c.textContent = ch;
    mask.appendChild(c);
    el.appendChild(mask);
    chars.push(c);
  });
  return chars;
};

const playHeroIntro = ({ delay = 0, from = null, bgEl = null, onDone = null } = {}) => {
  const root = document.documentElement;
  const chars = splitHeroTitle();
  const navbar = document.getElementById('main-navbar');
  const q = (s) => document.querySelector(s);
  const targets = ['.hero-badge', '#hero-subtitle', '#hero-button', '.btn-ghost', '#scroll-indicator']
    .map(q).filter(Boolean);

  // "Aufer" = 5 huruf pertama judul; " Site" = sisanya
  const aufChars = chars.slice(0, 5);
  const siteChars = from ? chars.slice(5) : chars;

  // Ukur posisi kata "Aufer" di judul SEBELUM ada transformasi apa pun
  let fly = null;
  if (from && aufChars.length === 5) {
    const rs = aufChars.map((c) => c.getBoundingClientRect());
    const left = Math.min(...rs.map((r) => r.left)), right = Math.max(...rs.map((r) => r.right));
    const top = Math.min(...rs.map((r) => r.top)), bottom = Math.max(...rs.map((r) => r.bottom));
    const fr = from.getBoundingClientRect();
    fly = {
      dx: (left + right) / 2 - (fr.left + fr.width / 2),
      dy: (top + bottom) / 2 - (fr.top + fr.height / 2),
      s: (right - left) / fr.width,
    };
  }

  // Keadaan awal lewat inline style, baru kelas .intro dilepas (tanpa kedip)
  gsap.set(targets, { opacity: 0, y: 28 });
  gsap.set(siteChars, { yPercent: 118, rotate: 7, transformOrigin: '0% 100%' });
  if (fly) gsap.set(aufChars, { opacity: 0 });   // "Aufer" di judul tidak beranimasi: hanya ditukar saat kata terbang mendarat
  gsap.set('#hero-title', { opacity: 1 });
  if (!fly) root.classList.remove('intro');

  const tl = gsap.timeline({ delay, defaults: { ease: 'power4.out' } });
  let t = 0; // titik waktu saat judul mulai tampil
  if (fly) {
    // Selama terbang: tanpa filter blur & tanpa animasi lain, agar tetap mulus
    gsap.set(from, { filter: 'none' });
    const FLIGHT = 1.3;
    const land = () => {
      // pertukaran terjadi SETELAH penerbangan benar-benar selesai → posisi & ukuran identik, tanpa loncatan
      gsap.set(aufChars, { opacity: 1, clearProps: 'transform' });
      gsap.set(from, { opacity: 0 });
      root.classList.remove('intro');
    };
    tl.add(gsap.to(from, { x: fly.dx, y: fly.dy, scale: fly.s, duration: FLIGHT, ease: 'power3.inOut', onComplete: land }), 0);
    if (bgEl) tl.to(bgEl, { opacity: 0, duration: 1.0, ease: 'power1.inOut' }, 0.2);
    t = FLIGHT;
  }
  tl.to('.hero-badge', { opacity: 1, y: 0, duration: 0.9, clearProps: 'transform,opacity' }, t + (fly ? 0.1 : 0))
    .to(siteChars, { yPercent: 0, rotate: 0, duration: 1.1, stagger: fly ? 0.09 : 0.055, clearProps: 'transform' }, t + 0.05)
    .to('#hero-subtitle', { opacity: 1, y: 0, duration: 1, clearProps: 'transform' }, t + 0.55)
    .to(['#hero-button', '.btn-ghost'], { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, clearProps: 'transform' }, t + 0.8)
    .to('#scroll-indicator', { opacity: 1, y: 0, duration: 1, ease: 'power2.out', clearProps: 'transform' }, t + 1.4)
    .add(() => { if (navbar) navbar.classList.remove('nav-hidden'); }, fly ? t + 0.2 : 0.55)
    .add(() => { gsap.set('#hero-title', { clearProps: 'opacity' }); if (onDone) onDone(); }, '>');
  return tl;
};

// Daftarkan data yang harus siap sebelum preloader dibuka (hanya untuk halaman yang sedang dibuka)
const registerReadiness = () => {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/gamer-site') expectReady('gamer');
  else if (path === '/') {
    [['about', 'about-root'], ['skills', 'skills-root'], ['portfolio', 'portfolio-root']].forEach(([name, id]) => {
      if (document.getElementById(id)) expectReady(name);
    });
  }
};

// Resolve saat window load + semua data penting siap (dengan batas waktu agar tidak menggantung)
const whenPageReady = () => {
  const pageLoaded = document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise((r) => window.addEventListener('load', r, { once: true }));
  return Promise.race([
    Promise.all([pageLoaded, whenDataReady(10000)]),
    new Promise((r) => setTimeout(r, 10500)),
  ]);
};

const initPreloader = () => {
  const preloader = document.getElementById('preloader');
  const root = document.documentElement;
  const navbar = document.getElementById('main-navbar');

  const fullIntro = root.classList.contains('intro');
  const unlock = () => root.classList.remove('intro-lock');

  // Mode cepat: halaman lain, kunjungan berikutnya, atau pengguna meminta gerak dikurangi
  if (!preloader || !fullIntro) {
    root.classList.remove('intro', 'intro-lock');
    if (!preloader) { if (navbar) navbar.classList.remove('nav-hidden'); return; }
    let ready = false;
    setTimeout(() => { if (!ready) preloader.classList.add('waiting'); }, 400); // indikator hanya bila memang menunggu
    whenPageReady().then(() => {
      ready = true;
      setTimeout(() => {
        preloader.classList.remove('waiting');
        preloader.classList.add('fade-out');
        if (document.getElementById('hero-title')) playHeroIntro({ delay: 0.1 });
        else if (navbar) navbar.classList.remove('nav-hidden');
      }, 300);
    });
    return;
  }

  try { sessionStorage.setItem('introSeen', '1'); } catch (e) { /* abaikan */ }

  const bgEl = document.getElementById('pl-bg');
  const brand = document.getElementById('pl-brand');
  const words = [...preloader.querySelectorAll('.pl-word')];

  // "Aufer" dipecah per huruf agar bisa muncul satu per satu: A  u  f  e  r
  const letters = [...'Aufer'].map((ch) => {
    const s = document.createElement('span');
    s.textContent = ch;
    brand.appendChild(s);
    return s;
  });

  const BLUR_OUT = { opacity: 0, filter: 'blur(14px)' };
  gsap.set([...words, brand], { xPercent: -50, yPercent: -50 });
  gsap.set([...words, brand], BLUR_OUT);

  let revealed = false;
  let seq = null;
  const finish = () => { preloader.remove(); unlock(); };
  const reveal = (skipped) => {
    if (revealed) return;
    revealed = true;
    if (seq) seq.kill();
    if (skipped) {
      // lewati: tanpa penerbangan, intro memudar lalu judul tampil biasa
      gsap.killTweensOf([...words, brand, ...letters]);
      gsap.to(preloader, { opacity: 0, duration: 0.5, onComplete: finish });
      playHeroIntro({ delay: 0.1 });
      return;
    }
    preloader.classList.remove('waiting');
    preloader.classList.add('flying');
    playHeroIntro({ delay: 0, from: brand, bgEl, onDone: finish });
  };

  // Urutan: "Hello World" → "Welcome to" → A u f e r → Aufer (besar) → terbang ke "Aufer Site"
  const tl = gsap.timeline({ paused: true, onComplete: () => reveal(false) });
  seq = tl;
  words.forEach((w) => {
    tl.fromTo(w, { ...BLUR_OUT, y: 18 }, { opacity: 1, filter: 'blur(0px)', y: 0, duration: 0.65, ease: 'power3.out' })
      .to(w, { ...BLUR_OUT, y: -14, duration: 0.45, ease: 'power2.in' }, '+=0.6');
  });
  const bigSize = `${Math.min(window.innerWidth * 0.2, 280)}px`;
  tl.set(brand, { opacity: 1, filter: 'blur(0px)' })
    .fromTo(letters, { opacity: 0, filter: 'blur(10px)', y: 14 }, { opacity: 1, filter: 'blur(0px)', y: 0, duration: 0.55, stagger: 0.14, ease: 'power3.out' })
    .to(brand, { letterSpacing: '-0.03em', textIndent: '0em', fontSize: bigSize, duration: 1.2, ease: 'power4.inOut' }, '+=0.35')
    .to(letters, { color: '#ffffff', duration: 0.6, stagger: 0.05 }, '<0.4')
    .to({}, { duration: 0.5 });

  // Loading awal dulu: tunggu window load + data API, baru "Hello World" dimulai
  let started = false;
  setTimeout(() => { if (!started) preloader.classList.add('waiting'); }, 300); // indikator hanya bila memang menunggu
  whenPageReady().then(() => {
    started = true;
    preloader.classList.remove('waiting');
    setTimeout(() => tl.play(), 450); // beri waktu indikator memudar
  });
};

// Helper function untuk mendapatkan index item yang terlihat
const findVisibleItemIndex = (carousel, items) => {
  try {
    const carouselRect = carousel.getBoundingClientRect();
    const carouselCenter = carouselRect.left + carouselRect.width / 2;

    let closestItem = 0;
    let closestDistance = Number.MAX_VALUE;

    items.forEach((item, index) => {
      const itemRect = item.getBoundingClientRect();
      const itemCenter = itemRect.left + itemRect.width / 2;
      const distance = Math.abs(carouselCenter - itemCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestItem = index;
      }
    });

    return closestItem;
  } catch (error) {
    console.error('Error finding visible item index:', error);
    return 0;
  }
};

// Initialize carousel for portfolio
const initPortfolioCarousel = () => {
  const carousel = document.getElementById('portfolio-carousel');
  if (!carousel) {
    console.error('Portfolio carousel element not found');
    return;
  }

  const items = Array.from(carousel.querySelectorAll('.portfolio-item'));
  console.log(`Found ${items.length} portfolio items for carousel`);

  // Jika tidak ada item, keluar dari fungsi
  if (items.length === 0) return;

  // Desktop navigation buttons
  const prevButton = document.getElementById('carousel-prev');
  const nextButton = document.getElementById('carousel-next');

  // Variable to track touch start position
  let touchStartX = 0;
  let touchEndX = 0;
  let isTouchScrolling = false;
  let initialScrollPosition = 0;

  // Threshold for swipe detection (in pixels)
  const SWIPE_THRESHOLD = 50;

  // Track if we are in desktop or mobile
  const isMobile = window.innerWidth <= 768;

  const scrollToItem = (index) => {
    try {
      if (index < 0) index = 0;
      if (index >= items.length) index = items.length - 1;

      const item = items[index];
      carousel.scrollTo({
        left: item.offsetLeft - (carousel.offsetWidth - item.offsetWidth) / 2,
        behavior: 'smooth'
      });

      // Update projects counter
      updateProjectCounter(index, items.length);
    } catch (error) {
      console.error('Error scrolling to item:', error);
    }
  };

  // Create and update project counter (1/7, 2/7, etc.)
  const updateProjectCounter = (currentIndex, totalItems) => {
    let counter = document.getElementById('portfolio-counter');

    if (!counter) {
      counter = document.createElement('div');
      counter.id = 'portfolio-counter';
      counter.className = 'portfolio-counter';

      // Create a container div for better positioning
      const counterContainer = document.createElement('div');
      counterContainer.className = 'counter-container';
      counterContainer.appendChild(counter);

      // Insert before carousel instead of appending as child
      carousel.parentNode.insertBefore(counterContainer, carousel);
    }

    counter.textContent = `${currentIndex + 1}/${totalItems}`;
  };

  // Improved touch event handlers
  const handleTouchStart = (e) => {
    try {
      // Store the initial touch position
      touchStartX = e.touches[0].clientX;
      initialScrollPosition = carousel.scrollLeft;
      isTouchScrolling = false;
    } catch (error) {
      console.error('Error in touch start handler:', error);
    }
  };

  const handleTouchMove = (e) => {
    try {
      // Do not prevent default scrolling if the user is swiping up/down
      const touchY = e.touches[0].clientY;
      const startTouchY = e.touches[0].initialTouchY || touchY;

      // Check if scrolling vertically (more vertical than horizontal)
      const touchCurrentX = e.touches[0].clientX;
      const deltaX = Math.abs(touchCurrentX - touchStartX);
      const deltaY = Math.abs(touchY - startTouchY);

      // If scrolling more vertically, don't interfere with page scroll
      if (deltaY > deltaX) {
        isTouchScrolling = true;
        return;
      }

      // For horizontal swipes in the carousel, prevent page scrolling
      if (deltaX > 10 && !isTouchScrolling) {
        // e.preventDefault(); // Commented out to allow natural scrolling
      }
    } catch (error) {
      console.error('Error in touch move handler:', error);
    }
  };

  const handleTouchEnd = (e) => {
    try {
      // If vertical scrolling detected, don't handle the swipe
      if (isTouchScrolling) {
        return;
      }

      // Calculate the final position
      touchEndX = e.changedTouches[0].clientX;
      const diffX = touchStartX - touchEndX;

      // Determine the direction of the swipe
      if (Math.abs(diffX) > SWIPE_THRESHOLD) {
        // Find the current visible item index
        const visibleItemIndex = findVisibleItemIndex(carousel, items);

        if (diffX > 0) {
          // Swipe left (next)
          scrollToItem(visibleItemIndex + 1);
        } else {
          // Swipe right (previous)
          scrollToItem(visibleItemIndex - 1);
        }
      } else {
        // If it was a small movement, restore to the initial position
        carousel.scrollTo({
          left: initialScrollPosition,
          behavior: 'smooth'
        });
      }
    } catch (error) {
      console.error('Error in touch end handler:', error);
    }
  };

  // Desktop navigation event listeners
  if (prevButton) {
    prevButton.addEventListener('click', () => {
      try {
        const visibleIndex = findVisibleItemIndex(carousel, items);
        scrollToItem(visibleIndex - 1);
      } catch (error) {
        console.error('Error in prev button handler:', error);
      }
    });
  }

  if (nextButton) {
    nextButton.addEventListener('click', () => {
      try {
        const visibleIndex = findVisibleItemIndex(carousel, items);
        scrollToItem(visibleIndex + 1);
      } catch (error) {
        console.error('Error in next button handler:', error);
      }
    });
  }

  // Add improved touch event listeners
  carousel.addEventListener('touchstart', handleTouchStart, { passive: true });
  carousel.addEventListener('touchmove', handleTouchMove, { passive: true });
  carousel.addEventListener('touchend', handleTouchEnd, { passive: true });

  // Initialize to the first item
  setTimeout(() => {
    scrollToItem(0);
  }, 100);

  // Update scroll position on resize
  window.addEventListener('resize', () => {
    const visibleIndex = findVisibleItemIndex(carousel, items);
    scrollToItem(visibleIndex);
  });

  console.log('Portfolio carousel initialized successfully');
};

// Initialize lightbox gallery
const initLightboxGallery = () => {
  const modal = document.getElementById('lightbox-modal');
  const closeButton = document.getElementById('close-lightbox');
  const lightboxImage = document.getElementById('lightbox-image');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxDescription = document.getElementById('lightbox-description');
  const zoomInButton = document.getElementById('zoom-in');
  const zoomOutButton = document.getElementById('zoom-out');
  const thumbnailsContainer = document.getElementById('thumbnails');
  const lightboxContent = document.getElementById('lightbox-content');

  if (!modal || !lightboxImage) {
    console.error('Lightbox elements not found');
    return null;
  }

  // Pre-load lightbox modal styling untuk menghindari lag saat pertama kali dibuka
  modal.style.display = 'none';

  // Certificate Lightbox Handler
  const certificateButtons = document.querySelectorAll('.certificate-button');
  certificateButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const certificateUrl = button.getAttribute('href');
      const certificateTitle = button.querySelector('span').textContent;

      // Reset zoom dan position
      scale = 1;
      translateX = 0;
      translateY = 0;
      updateImageTransform();

      // Update lightbox content
      lightboxImage.src = certificateUrl;
      lightboxTitle.textContent = certificateTitle;

      lightboxDescription.innerHTML = 'Klik dua kali untuk memperbesar atau kecilkan. Klik dan tahan untuk menggeser gambar.';

      // Clear thumbnails
      if (thumbnailsContainer) {
        thumbnailsContainer.innerHTML = '';
      }

      // Show modal
      modal.style.display = 'flex';
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });

  // Portfolio data untuk lightbox
  const portfolioItems = Array.from(document.querySelectorAll('.portfolio-item'));
  let currentIndex = 0;
  let scale = 1;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let translateX = 0;
  let translateY = 0;

  // Open lightbox dengan index project
  const openLightbox = (index) => {
    console.log('Opening lightbox with index:', index);
    currentIndex = index;

    if (!portfolioItems[currentIndex]) {
      console.error('Portfolio item not found for index:', index);
      return;
    }

    const item = portfolioItems[currentIndex];
    const imageUrl = item.getAttribute('data-image') || '';

    console.log('Found portfolio item:', item);
    console.log('Image URL:', imageUrl);

    // Reset zoom dan position
    resetZoomAndPosition();

    // Update lightbox content - gunakan URL gambar yang tersimpan dalam atribut data-image
    if (imageUrl && imageUrl !== '') {
      lightboxImage.src = imageUrl;
      lightboxImage.alt = item.getAttribute('data-title') || '';
      console.log('Setting image src to:', imageUrl);
    } else {
      console.error('Image URL not found or empty in portfolio item');
      // Fallback ke gambar pertama di dalam item jika ada
      const image = item.querySelector('img');
      if (image) {
        lightboxImage.src = image.src;
        lightboxImage.alt = image.alt;
        console.log('Fallback setting image src to:', image.src);
      }
    }

    // Update title dan description
    lightboxTitle.textContent = item.getAttribute('data-title') || '';
    lightboxDescription.innerHTML = item.getAttribute('data-description') || '';

    // Tambahkan instruksi navigasi
    const navigationInstructions = '<div class="text-xs mt-2 text-gray-400">Klik dua kali untuk memperbesar atau kecilkan. Klik dan tahan untuk menggeser gambar.</div>';

    lightboxDescription.innerHTML += navigationInstructions;

    // Generate thumbnails
    generateThumbnails();

    // Show modal
    modal.classList.remove('hidden'); // Hapus hidden class jika ada
    modal.style.display = 'flex';
    modal.classList.add('active');
    console.log('Modal classes after open:', modal.className);
    document.body.style.overflow = 'hidden';
  };

  // Close lightbox
  const closeLightbox = () => {
    // Animasikan penutupan
    gsap.to(lightboxImage, {
      opacity: 0,
      duration: 0.2,
      onComplete: () => {
        modal.classList.remove('active');
        modal.style.display = 'none';
        // Restore scroll
        document.body.style.overflow = '';
        // Reset lightbox content setelah ditutup
        setTimeout(() => {
          lightboxImage.style.opacity = 1;
        }, 100);
      }
    });

    // Kembali ke halaman sebelumnya jika URL mengandung hash
    if (window.location.hash) {
      history.back();
    }
  };

  // Reset zoom and position
  const resetZoomAndPosition = () => {
    scale = 1;
    translateX = 0;
    translateY = 0;
    lightboxImage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    lightboxImage.classList.remove('zoomed');
    document.getElementById('lightbox-content').style.cursor = 'grab';
  };

  // Update image transform
  const updateImageTransform = () => {
    lightboxImage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  };

  // Zoom in
  const zoomIn = () => {
    if (scale < 3) {
      scale += 0.5;
      updateImageTransform();

      if (scale > 1) {
        lightboxImage.classList.add('zoomed');
        document.getElementById('lightbox-content').style.cursor = 'move';
      }
    }
  };

  // Zoom out
  const zoomOut = () => {
    if (scale > 0.5) {
      scale -= 0.5;

      if (scale === 1) {
        resetZoomAndPosition();
      } else {
        updateImageTransform();
      }
    }
  };

  // Generate thumbnails
  const generateThumbnails = () => {
    if (!thumbnailsContainer) return;

    thumbnailsContainer.innerHTML = '';

    portfolioItems.forEach((item, index) => {
      const thumbnail = document.createElement('div');
      thumbnail.className = 'thumbnail';
      if (index === currentIndex) {
        thumbnail.classList.add('active');
      }

      const img = document.createElement('img');
      const itemImg = item.querySelector('img');
      if (itemImg) {
        img.src = itemImg.src;
        img.alt = `Thumbnail ${index + 1}`;
      }

      thumbnail.appendChild(img);
      thumbnailsContainer.appendChild(thumbnail);

      thumbnail.addEventListener('click', () => {
        openLightbox(index);
      });
    });
  };

  // Update active thumbnail
  const updateActiveThumbnail = () => {
    if (!thumbnailsContainer) return;

    const thumbnails = thumbnailsContainer.querySelectorAll('.thumbnail');

    thumbnails.forEach((thumb, index) => {
      if (index === currentIndex) {
        thumb.classList.add('active');
      } else {
        thumb.classList.remove('active');
      }
    });
  };

  // Add event listeners
  if (closeButton) {
    closeButton.addEventListener('click', closeLightbox);
  }

  if (zoomInButton) {
    zoomInButton.addEventListener('click', zoomIn);
  }

  if (zoomOutButton) {
    zoomOutButton.addEventListener('click', zoomOut);
  }

  // Listen for escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeLightbox();
    }
  });

  // Handle mouse/touch events untuk fitur drag gambar (saat zoomed)
  const handleDragStart = (e) => {
    if (scale <= 1) return; // Hanya drag saat zoomed in

    // Untuk mouse
    if (e.type === 'mousedown') {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      lightboxContent.style.cursor = 'grabbing';
    }
    // Untuk touch
    else if (e.type === 'touchstart') {
      isDragging = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }

    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;

    let clientX, clientY;

    // Untuk mouse
    if (e.type === 'mousemove') {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    // Untuk touch
    else if (e.type === 'touchmove') {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      return;
    }

    // Hitung jarak perpindahan
    const moveX = clientX - startX;
    const moveY = clientY - startY;

    // Update posisi
    translateX += moveX;
    translateY += moveY;

    // Batasi perpindahan berdasarkan ukuran gambar dan zoom level
    const imageRect = lightboxImage.getBoundingClientRect();
    const containerRect = lightboxContent.getBoundingClientRect();

    // Batas berdasarkan zoom level
    const bounds = {
      left: (imageRect.width * scale - containerRect.width) / 2,
      right: (imageRect.width * scale - containerRect.width) / 2,
      top: (imageRect.height * scale - containerRect.height) / 2,
      bottom: (imageRect.height * scale - containerRect.height) / 2
    };

    // Batasi perpindahan
    if (bounds.left > 0) {
      translateX = Math.max(Math.min(translateX, bounds.left), -bounds.right);
    } else {
      translateX = 0;
    }

    if (bounds.top > 0) {
      translateY = Math.max(Math.min(translateY, bounds.top), -bounds.bottom);
    } else {
      translateY = 0;
    }

    // Update transform
    updateImageTransform();

    // Reset start point
    startX = clientX;
    startY = clientY;

    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnd = (e) => {
    if (!isDragging) return;

    isDragging = false;
    if (scale > 1) {
      lightboxContent.style.cursor = 'move';
    } else {
      lightboxContent.style.cursor = 'grab';
    }

    e.preventDefault();
    e.stopPropagation();
  };

  // Mouse events
  lightboxContent.addEventListener('mousedown', handleDragStart);
  window.addEventListener('mousemove', handleDragMove);
  window.addEventListener('mouseup', handleDragEnd);

  // Touch events
  lightboxContent.addEventListener('touchstart', handleDragStart, { passive: false });
  window.addEventListener('touchmove', handleDragMove, { passive: false });
  window.addEventListener('touchend', handleDragEnd);

  // Double click untuk cepat zoom in/out
  lightboxContent.addEventListener('dblclick', (e) => {
    e.preventDefault();

    if (scale > 1) {
      // Jika sudah di-zoom, reset ke normal
      resetZoomAndPosition();
    } else {
      // Jika belum di-zoom, zoom ke 2x
      scale = 2;
      updateImageTransform();
      lightboxImage.classList.add('zoomed');
      lightboxContent.style.cursor = 'move';
    }
  });

  // Wheel event untuk zoom
  lightboxContent.addEventListener('wheel', (e) => {
    e.preventDefault();

    // Tentukan sensitivitas zoom
    const zoomSpeed = 0.1;

    // Hitung perubahan zoom berdasarkan wheel delta
    if (e.deltaY < 0) {
      // Scroll up - zoom in
      if (scale < 3) {
        scale += zoomSpeed;
        if (scale > 1) {
          lightboxImage.classList.add('zoomed');
          lightboxContent.style.cursor = 'move';
        }
      }
    } else {
      // Scroll down - zoom out
      if (scale > 0.5) {
        scale -= zoomSpeed;
        if (scale <= 1) {
          resetZoomAndPosition();
        }
      }
    }

    // Update transform
    updateImageTransform();
  }, { passive: false });

  return {
    openLightbox,
    closeLightbox,
    resetZoomAndPosition,
    zoomIn,
    zoomOut
  };
};

// Initialize portfolio view buttons
const initPortfolioViewButtons = () => {
  console.log('Initializing portfolio view buttons');

  // Get all view buttons from the portfolio
  const viewButtons = document.querySelectorAll('.view-button');

  // Initialize lightbox elements
  const modal = document.getElementById('lightbox-modal');
  const closeButton = document.getElementById('close-lightbox');
  const lightboxImage = document.getElementById('lightbox-image');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxDescription = document.getElementById('lightbox-description');

  if (!modal || !lightboxImage) {
    console.error('Lightbox elements not found');
    return;
  }

  // Pre-load lightbox modal styling
  modal.style.display = 'none';

  console.log('View buttons found:', viewButtons.length);

  // Add event listeners to each button
  viewButtons.forEach((button) => {
    console.log('Adding click event to button');
    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();

      try {
        console.log('Button clicked');
        // Ambil parent element (portfolio item)
        const portfolioItem = this.closest('.portfolio-item');
        if (!portfolioItem) {
          console.error('Could not find parent portfolio item');
          return;
        }

        // Simpan ID proyek yang aktif di modal untuk referensi saat switchLanguage
        const projectId = portfolioItem.getAttribute('data-id');
        modal.setAttribute('data-active-project', projectId);

        console.log('Portfolio item found:', portfolioItem.getAttribute('data-id'));

        // Ambil URL gambar
        let imageUrl = portfolioItem.getAttribute('data-image');
        if (!imageUrl) {
          const imgElement = portfolioItem.querySelector('img');
          if (imgElement) {
            imageUrl = imgElement.src;
            portfolioItem.setAttribute('data-image', imageUrl);
          } else {
            console.error('No image found in portfolio item');
            return;
          }
        }

        console.log('Opening lightbox with image:', imageUrl);

        // Reset zoom dan position
        let scale = 1;
        let translateX = 0;
        let translateY = 0;
        lightboxImage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        lightboxImage.classList.remove('zoomed');

        // Update lightbox content
        lightboxImage.src = imageUrl;

        // Set title and description
        lightboxTitle.textContent = portfolioItem.getAttribute('data-title') || '';
        lightboxDescription.innerHTML = portfolioItem.getAttribute('data-description') || '';

        // Tambahkan instruksi navigasi
        const navigationInstructions = '<div class="text-xs mt-2 text-gray-400">Klik dua kali untuk memperbesar atau kecilkan. Klik dan tahan untuk menggeser gambar.</div>';

        lightboxDescription.innerHTML += navigationInstructions;

        // Show modal
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        console.log('Modal opened successfully');
      } catch (error) {
        console.error('Error opening lightbox:', error);
      }
    });
  });

  // Initialize close button functionality
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      console.log('Close button clicked');
      modal.classList.remove('active');
      setTimeout(() => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
      }, 300);
    });
  }
};

// Initialize text animation for changing subtitle
const initChangingText = () => {
  const changingTextElement = document.getElementById('changing-text');
  if (!changingTextElement) return;

  const texts = [
    'Web Developer',
    '3D Enthusiast',
    'IoT Developer',
    'Gamer',
    'Mobile Developer'
  ];

  let currentIndex = 0;

  const updateText = () => {
    // Fade out
    gsap.to(changingTextElement, {
      opacity: 0,
      y: -20,
      duration: 0.5,
      onComplete: () => {
        // Update text
        currentIndex = (currentIndex + 1) % texts.length;
        changingTextElement.textContent = texts[currentIndex];

        // Fade in
        gsap.to(changingTextElement, {
          opacity: 1,
          y: 0,
          duration: 0.5
        });
      }
    });
  };

  // Set initial text
  changingTextElement.textContent = texts[0];

  // Start the animation cycle
  setInterval(updateText, 3000);
};

// Initialize tech stack text animation in footer
const initTechStackAnimation = () => {
  const techStackText = document.getElementById('tech-stack-text');
  if (!techStackText) return;

  const technologies = [
    'HTML',
    'CSS',
    'JS',
    'Three',
    'React',
    'Tailwind',
    'WebGL'
  ];

  let currentIndex = 0;

  const updateTechText = () => {
    // Typing effect
    let currentText = technologies[currentIndex];
    let i = 0;

    // Clear existing text
    techStackText.textContent = '';

    // Typing animation
    const typeChar = () => {
      if (i < currentText.length) {
        techStackText.textContent += currentText.charAt(i);
        i++;
        setTimeout(typeChar, 150); // Typing speed
      } else {
        // Once typing is done, schedule deletion after a pause
        setTimeout(deleteTech, 2000);
      }
    };

    // Deletion animation
    const deleteTech = () => {
      if (techStackText.textContent.length > 0) {
        techStackText.textContent = techStackText.textContent.slice(0, -1);
        setTimeout(deleteTech, 75); // Deletion speed
      } else {
        // Once deletion is done, move to next technology
        currentIndex = (currentIndex + 1) % technologies.length;
        setTimeout(updateTechText, 500);
      }
    };

    // Start typing
    typeChar();
  };

  // Set initial text and start animation
  updateTechText();
};

// Initialize Indonesia real-time clock
const initIndonesiaTime = () => {
  const dayNameEl = document.getElementById('day-name');
  const dateNumEl = document.getElementById('date-num');
  const monthNameEl = document.getElementById('month-name');
  const yearNumEl = document.getElementById('year-num');
  const timeDisplayEl = document.getElementById('time-display');
  const timeContainerEl = document.getElementById('indonesia-time');

  if (!dayNameEl || !dateNumEl || !monthNameEl || !yearNumEl || !timeDisplayEl) return;

  // Hari dalam Bahasa Indonesia
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  // Bulan dalam Bahasa Indonesia
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Update waktu
  const updateIndonesiaTime = () => {
    // Gunakan metode yang lebih akurat untuk mendapatkan waktu WIB (GMT+7)
    const now = new Date();

    // Tanggal/waktu UTC dalam milidetik
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);

    // Konversi ke WIB (UTC+7)
    // Kurangi 2000 milidetik (2 detik) untuk menyesuaikan perbedaan dengan server waktu referensi
    const wibTime = new Date(utcTime + (3600000 * 7) - 2000);

    const day = wibTime.getDay();
    const date = wibTime.getDate();
    const month = wibTime.getMonth();
    const year = wibTime.getFullYear();

    const hours = String(wibTime.getHours()).padStart(2, '0');
    const minutes = String(wibTime.getMinutes()).padStart(2, '0');
    const seconds = String(wibTime.getSeconds()).padStart(2, '0');

    // Update elemen HTML
    dayNameEl.textContent = days[day];
    dateNumEl.textContent = date;
    monthNameEl.textContent = months[month];
    yearNumEl.textContent = year;
    timeDisplayEl.textContent = `${hours}:${minutes}:${seconds} WIB`;
  };

  // Update pertama kali
  updateIndonesiaTime();

  // Tampilkan elemen waktu dengan animasi
  gsap.to(timeContainerEl, {
    opacity: 1,
    duration: 1,
    delay: 0.5
  });

  // Update setiap detik
  setInterval(updateIndonesiaTime, 1000);

};


// Initialize CV modal
const initCVModal = () => {
  const cvModal = document.getElementById('cv-modal');
  const cvModalContent = document.getElementById('cv-modal-content');
  const closeModalButton = document.getElementById('close-cv-modal');

  if (!cvModal || !closeModalButton || !cvModalContent) return;

  const openModal = () => {
    // Show modal
    cvModal.classList.remove('hidden');

    // Animate content
    gsap.to(cvModalContent, {
      scale: 1,
      opacity: 1,
      duration: 0.3,
      ease: "back.out(1.5)"
    });

    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    // Animate content out
    gsap.to(cvModalContent, {
      scale: 0.95,
      opacity: 0,
      duration: 0.2,
      ease: "power2.in",
      onComplete: () => {
        // Hide modal
        cvModal.classList.add('hidden');

        // Restore body scrolling
        document.body.style.overflow = '';
      }
    });
  };

  // Expose to window for React components
  window.openCVModal = openModal;
  window.closeCVModal = closeModal;

  // View CV button (if exists statically)
  const viewCVButton = document.getElementById('view-cv-button');
  if (viewCVButton) {
    viewCVButton.addEventListener('click', openModal);
  }

  // Close button
  closeModalButton.addEventListener('click', closeModal);

  // Close on outside click
  cvModal.addEventListener('click', (e) => {
    if (e.target === cvModal) closeModal();
  });

  // Close modal on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !cvModal.classList.contains('hidden')) {
      closeModal();
    }
  });

  // Add hover animations for CV buttons
  const cvButtons = cvModal.querySelectorAll('a');
  cvButtons.forEach(button => {
    button.addEventListener('mouseenter', () => {
      gsap.to(button, {
        y: -5,
        boxShadow: '0 10px 15px rgba(0, 0, 0, 0.2)',
        duration: 0.2
      });
    });

    button.addEventListener('mouseleave', () => {
      gsap.to(button, {
        y: 0,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        duration: 0.2
      });
    });
  });
};

// Fungsi untuk mendeteksi dan mencegah inspect element
const preventInspect = () => {
  // Mencegah klik kanan
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  // Mencegah keyboard shortcuts untuk dev tools
  document.addEventListener('keydown', (e) => {
    // F12 key
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      return false;
    }

    // Ctrl+Shift+I / Cmd+Option+I
    if ((e.ctrlKey && e.shiftKey && e.key === 'I') ||
      (e.metaKey && e.altKey && e.key === 'i')) {
      e.preventDefault();
      return false;
    }

    // Ctrl+Shift+J / Cmd+Option+J
    if ((e.ctrlKey && e.shiftKey && e.key === 'J') ||
      (e.metaKey && e.altKey && e.key === 'j')) {
      e.preventDefault();
      return false;
    }

    // Ctrl+Shift+C / Cmd+Option+C
    if ((e.ctrlKey && e.shiftKey && e.key === 'C') ||
      (e.metaKey && e.altKey && e.key === 'c')) {
      e.preventDefault();
      return false;
    }

    // Ctrl+U / Cmd+Option+U (View Source)
    if ((e.ctrlKey && e.key === 'u') ||
      (e.metaKey && e.altKey && e.key === 'u')) {
      e.preventDefault();
      return false;
    }
  });

  // Deteksi ketika DevTools dibuka
  const detectDevTools = () => {
    const widthThreshold = window.outerWidth - window.innerWidth > 160;
    const heightThreshold = window.outerHeight - window.innerHeight > 160;

    if (widthThreshold || heightThreshold) {
      document.body.innerHTML = '<h1 style="text-align:center;margin-top:40vh">Inspeksi Halaman Tidak Diizinkan</h1>';
    }
  };

  setInterval(detectDevTools, 1000);
};

// ============ FORMULIR KONTAK ============
const initContactForm = () => {
  const form = document.getElementById('mail-form');
  if (!form) return;
  const nameEl = document.getElementById('mail-name');
  const emailEl = document.getElementById('mail-input');
  const msgEl = document.getElementById('mail-message');
  const count = document.getElementById('mail-count');
  const btn = document.getElementById('mail-btn');
  const status = document.getElementById('mail-status');
  const DEFAULT = status.textContent;
  const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  let lastSent = 0;
  const say = (msg, kind) => { status.textContent = msg; status.className = 'mail-status' + (kind ? ' ' + kind : ''); };
  const fields = [nameEl, emailEl, msgEl];

  fields.forEach((el) => el.addEventListener('input', () => {
    el.classList.remove('bad');
    if (status.className.includes('err')) say(DEFAULT);
  }));
  msgEl.addEventListener('input', () => { count.textContent = `${msgEl.value.length}/1000`; });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.elements.website.value) return;               // honeypot: bot mengisi kolom tersembunyi
    const name = nameEl.value.trim();
    const email = emailEl.value.trim();
    const message = msgEl.value.trim();
    const errors = [];
    if (!name || name.length > 100) errors.push([nameEl, 'Nama wajib diisi.']);
    if (!EMAIL_RE.test(email) || email.length > 254) errors.push([emailEl, 'Masukkan alamat email yang valid.']);
    if (!message || message.length > 1000) errors.push([msgEl, 'Pesan wajib diisi (maksimal 1000 karakter).']);
    if (errors.length) {
      errors.forEach(([el]) => el.classList.add('bad'));
      errors[0][0].focus();
      say(errors[0][1], 'err');
      return;
    }
    if (Date.now() - lastSent < 15000) { say('Tunggu sebentar sebelum mengirim lagi.', 'err'); return; }
    btn.disabled = true;
    say('Mengirim…');
    const { error } = await supabase.from('contacts').insert({ name, email, message });
    btn.disabled = false;
    if (error) {
      console.error(error);
      say('Gagal mengirim. Coba lagi nanti.', 'err');
      return;
    }
    lastSent = Date.now();
    form.reset();
    count.textContent = '0/1000';
    say('Terima kasih! Pesan Anda terkirim, saya akan membalas lewat email.', 'ok');
  });
};

// ============ NAVBAR ============
const initNavbar = () => {
  const navbar = document.getElementById('main-navbar');
  const burger = document.getElementById('burger-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!navbar || !burger || !sidebar || !overlay) return;

  // Scroll → .scrolled; sembunyi saat scroll ke bawah, muncul lagi saat scroll ke atas
  let lastY = window.scrollY;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    navbar.classList.toggle('scrolled', y > 30);
    if (y < 80 || y < lastY) navbar.classList.remove('nav-hidden');
    else if (y > lastY + 4 && !sidebar.classList.contains('open')) navbar.classList.add('nav-hidden');
    lastY = y;
  }, { passive: true });

  // Burger toggle
  const openSidebar = () => {
    burger.classList.add('open');
    sidebar.classList.add('open');
    overlay.style.display = 'block';
    setTimeout(() => overlay.classList.add('open'), 10);
    document.body.style.overflow = 'hidden';
  };
  const closeSidebar = () => {
    burger.classList.remove('open');
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
    setTimeout(() => { overlay.style.display = 'none'; }, 300);
    document.body.style.overflow = '';
  };

  burger.addEventListener('click', () => {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });
  overlay.addEventListener('click', closeSidebar);

  // Close sidebar when any sidebar/nav link clicked
  document.querySelectorAll('.sidebar-link, .nav-links a').forEach(link => {
    link.addEventListener('click', () => closeSidebar());
  });

  // Active link highlight via IntersectionObserver
  const sections = ['about', 'skills', 'portfolio', 'contact'];
  const allNavLinks = document.querySelectorAll('[data-section]');
  const setActive = (id) => {
    allNavLinks.forEach(a => {
      a.classList.toggle('active', a.dataset.section === id);
    });
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); });
  }, { threshold: 0.35 });
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) io.observe(el);
  });
};

// Inisialisasi ketika website dimuat
window.addEventListener('DOMContentLoaded', () => {
  // Inisialisasi fitur-fitur website
  initBackgroundScene();
  init3DModelScene();
  initScrollAnimations();
  initSmoothScroll();
  registerReadiness();
  initPreloader();
  initNavbar();
  initEffects();
  initContactForm();
  const yr = document.getElementById('foot-year');
  if (yr) yr.textContent = new Date().getFullYear();
  initChangingText();
  initTechStackAnimation();
  initIndonesiaTime();

  // Initialize About Section
  const aboutRoot = document.getElementById('about-root');
  if (aboutRoot) {
    ReactDOM.createRoot(aboutRoot).render(
      <React.StrictMode>
        <AboutSection />
      </React.StrictMode>
    );
  }

  // Initialize Skills Section
  const skillsRoot = document.getElementById('skills-root');
  if (skillsRoot) {
    ReactDOM.createRoot(skillsRoot).render(
      <React.StrictMode>
        <SkillsSection />
      </React.StrictMode>
    );
  }

  // Initialize Portfolio Section
  const portfolioRoot = document.getElementById('portfolio-root');
  if (portfolioRoot) {
    ReactDOM.createRoot(portfolioRoot).render(
      <React.StrictMode>
        <PortfolioSection />
      </React.StrictMode>
    );
  }

  // Initialize Admin App if on admin routes
  const adminRoot = document.getElementById('root');
  
  if (adminRoot) {
    ReactDOM.createRoot(adminRoot).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }

  initCVModal();
  initAnimatedUnderlines();

  // Terapkan perlindungan terhadap inspeksi (hapus komentar untuk mengaktifkan)
  // preventInspect();

  // Tampilkan pesan warning jika DevTools dibuka
  console.log("%cStop!", "color:red;font-size:50px;font-weight:bold;");
  console.log("%cWebsite ini dilindungi. Menggunakan DevTools dapat melanggar ketentuan penggunaan.", "font-size:20px;");
});


// Initialize animated underlines for titles
const initAnimatedUnderlines = () => {
  const underlines = document.querySelectorAll('.animated-underline');

  // Add class to hero title immediately for instant animation
  const heroUnderline = document.querySelector('#hero-title .animated-underline');
  if (heroUnderline) {
    setTimeout(() => {
      heroUnderline.classList.add('active');
    }, 1500); // Delay sedikit setelah animasi opacity
  }

  // Handle other section titles with scroll
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.4
  };

  const underlineObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('active');
        }, 300);

        // Stop observing after animation
        underlineObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Start observing each underline
  underlines.forEach(underline => {
    // Skip hero title as we handle it separately
    if (!underline.closest('#hero-title')) {
      underlineObserver.observe(underline);
    }
  });
};

// Tambahkan ini di service-worker.js
self.addEventListener('fetch', event => {
  if (event.request.url.includes('devtools')) {
    event.respondWith(new Response('', { status: 403 }));
  }
}); 