import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { assetUrl } from '../utils/assets';
import { markReady, preloadImages } from '../utils/readiness';
import Slider from "react-slick";
import { Fancybox } from "@fancyapps/ui";
import "@fancyapps/ui/dist/fancybox/fancybox.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const SliderComponent = typeof Slider === 'function' ? Slider : (Slider.default || Slider);


const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-image skeleton"></div>
    <div className="skeleton-title skeleton" style={{ marginTop: '1rem' }}></div>
    <div className="skeleton-text skeleton" style={{ marginTop: '0.75rem' }}></div>
  </div>
);

// Geser otomatis tiap 5 detik saat idle. Setelah pengunjung memakai panah / titik / swipe,
// geser otomatis berhenti dan baru lanjut lagi setelah RESUME_AFTER_MS tanpa interaksi.
const AUTOPLAY_MS = 5000;
const RESUME_AFTER_MS = 20000;

const Arrow = ({ dir, onClick, className, style, currentSlide, slideCount, ...rest }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={dir === 'next' ? 'Proyek berikutnya' : 'Proyek sebelumnya'}
    className={`pc-arrow pc-arrow-${dir}`}
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {dir === 'next' ? <path d="M5 12h14M13 6l6 6-6 6" /> : <path d="M19 12H5M11 6l-6 6 6 6" />}
    </svg>
  </button>
);

const linkInfo = (link) => {
  try {
    const u = new URL(link);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return { href: u.href, host: u.hostname.replace(/^www\./, ''), path: u.pathname === '/' ? '' : u.pathname };
  } catch { return null; }
};

const PortfolioSection = () => {
  const sliderRef = useRef(null);
  const wrapRef = useRef(null);
  const lastInteract = useRef(0);   // 0 = belum pernah berinteraksi
  const autoMove = useRef(false);   // true saat pergeseran berasal dari autoplay
  const hovered = useRef(false);
  const inView = useRef(true);
  const [visibleCertCount, setVisibleCertCount] = useState(6);
  const [loading, setLoading] = useState(true);

  const [projects, setProjects] = useState([]);
  const [certificates, setCertificates] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projRes, certRes] = await Promise.all([
          supabase.from('projects').select('*').order('position', { nullsFirst: false }).order('created_at'),
          supabase.from('certificates').select('*').order('position', { nullsFirst: false }).order('created_at')
        ]);
        if (projRes.error) throw projRes.error;
        if (certRes.error) throw certRes.error;
        const projData = projRes.data;
        const certData = certRes.data;
        setProjects(projData);
        setCertificates(certData);
        // Pra-muat gambar yang pertama terlihat agar kartu tidak muncul kosong
        await preloadImages([...projData.slice(0, 3), ...certData.slice(0, 3)].map((x) => assetUrl(x.image_path)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        markReady('portfolio');
      }
    };

    fetchData();


    Fancybox.bind('[data-fancybox]:not(.slick-cloned [data-fancybox])', {
      groupAll: false,
      Toolbar: { display: { left: [], middle: [], right: ['close'] } },
    });

    return () => {
      Fancybox.destroy();
    };
  }, []);

  const [slidesToShowState, setSlidesToShowState] = useState(3);

  useEffect(() => {
    const updateSlides = () => {
      const width = window.innerWidth;
      if (width < 768) setSlidesToShowState(1);
      else if (width < 1024) setSlidesToShowState(Math.min(2, projects.length));
      else setSlidesToShowState(Math.min(3, projects.length));
    };

    updateSlides();
    window.addEventListener('resize', updateSlides);
    return () => window.removeEventListener('resize', updateSlides);
  }, [projects.length]);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Autoplay buatan sendiri (menggantikan autoplay bawaan slick)
  useEffect(() => {
    if (projects.length < 2) return undefined;
    const id = setInterval(() => {
      if (document.hidden || hovered.current || !inView.current) return;
      if (lastInteract.current && Date.now() - lastInteract.current < RESUME_AFTER_MS) return;
      autoMove.current = true;
      sliderRef.current?.slickNext();
      setTimeout(() => { autoMove.current = false; }, 700);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [projects.length]);

  // Jangan geser saat carousel tidak terlihat di layar
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([en]) => { inView.current = en.isIntersecting; }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [loading]);

  const sliderSettings = {
    dots: true,
    dotsClass: 'slick-dots pc-dots',
    customPaging: (i) => <button type="button" aria-label={`Ke proyek ${i + 1}`} />,
    infinite: projects.length > 1,
    speed: 650,
    cssEase: 'cubic-bezier(0.22, 1, 0.36, 1)',
    slidesToShow: slidesToShowState,
    slidesToScroll: 1,
    autoplay: false,
    arrows: projects.length > slidesToShowState,
    prevArrow: <Arrow dir="prev" />,
    nextArrow: <Arrow dir="next" />,
    // Pergeseran yang bukan dari autoplay (panah, titik, swipe) = interaksi pengunjung
    beforeChange: () => { if (!autoMove.current) lastInteract.current = Date.now(); },
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: Math.min(2, projects.length), slidesToScroll: 1 } },
      { breakpoint: 768, settings: { slidesToShow: 1, slidesToScroll: 1, arrows: false } },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-16">
      {/* ===== CERTIFICATES ===== */}
      <div className="mb-24">
        <div className="mb-2">
          <span className="section-eyebrow">03 · Pencapaian</span>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            <span className="animated-underline active">
              Sertifikat
            </span>
          </h2>
        </div>
        <p style={{ color: '#aaa6c3', marginBottom: '2rem', fontSize: '0.95rem' }}>
          Klik kartu untuk melihat detail sertifikat.
        </p>

        <div className="certificate-grid">
          {loading
            ? Array(3).fill(0).map((_, i) => <SkeletonCard key={i} />)
            : certificates.slice(0, visibleCertCount).map((cert) => (
              <a
                key={cert.id}
                href={`${assetUrl(cert.image_path)}`}
                data-fancybox="gallery-certs"
                data-caption={cert.title}
                className="certificate-card"
              >
                <img src={`${assetUrl(cert.image_path)}`} alt={cert.title} loading="lazy" />
                <h3 style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.95rem', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                  {cert.title}
                </h3>
              </a>
            ))
          }
        </div>

        {!loading && visibleCertCount < certificates.length && (
          <div className="load-more-container">
            <button className="btn-load-more" onClick={() => setVisibleCertCount(v => v + 6)}>
              Muat Lebih Banyak
            </button>
          </div>
        )}
      </div>

      {/* ===== PROJECTS ===== */}
      <div style={{ paddingBottom: '4rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
          <span className="section-eyebrow center">04 · Karya</span>
          <h2 className="text-3xl md:text-4xl font-bold text-white gallery-title">
            <span className="animated-underline active">
              Proyek
            </span>
          </h2>
        </div>
        <p style={{ color: '#aaa6c3', textAlign: 'center', marginBottom: '0', fontSize: '0.95rem' }}>
          Klik gambar untuk memperbesar · geser atau pakai panah untuk melihat proyek lain
        </p>

        <div
          className="project-slider-container pc-wrap"
          ref={wrapRef}
          onMouseEnter={() => { hovered.current = true; }}
          onMouseLeave={() => { hovered.current = false; }}
        >
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(3).fill(0).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <SliderComponent ref={sliderRef} {...sliderSettings}>
              {projects.map((project, i) => {
                const info = project.link ? linkInfo(project.link) : null;
                const tags = (project.tags || '').split(',').map((s) => s.trim()).filter(Boolean);
                return (
                  <div key={project.id} className="pc-slide">
                    <article className="pcard">
                      <a
                        href={assetUrl(project.image_path)}
                        data-fancybox="gallery-projects"
                        data-caption={`<b>${project.title}</b>${project.description ? `<br/>${project.description}` : ''}`}
                        className="pcard-media"
                        aria-label={`Lihat gambar ${project.title}`}
                      >
                        <img src={assetUrl(project.image_path)} alt={project.title} loading="lazy" draggable="false" />
                        <span className="pcard-zoom">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                          </svg>
                          Lihat gambar
                        </span>
                      </a>
                      <div className="pcard-body">
                        <h3 className="pcard-title">{project.title}</h3>
                        {project.description && (
                          <p className="pcard-desc" dangerouslySetInnerHTML={{ __html: project.description }} />
                        )}
                        {info && (
                          <a href={info.href} target="_blank" rel="noopener noreferrer" className="pcard-link">
                            <img src={`https://www.google.com/s2/favicons?domain=${info.host}&sz=64`} alt="" width="20" height="20" loading="lazy" />
                            <span className="pcard-link-text">
                              <b>{info.host}</b>
                              <small>{info.path || 'Kunjungi projek'}</small>
                            </span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9" /></svg>
                          </a>
                        )}
                        {tags.length > 0 && (
                          <div className="pcard-tags">
                            {tags.map((tag) => <span key={tag} className="pcard-tag">{tag}</span>)}
                          </div>
                        )}
                      </div>
                    </article>
                  </div>
                );
              })}
            </SliderComponent>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortfolioSection;
