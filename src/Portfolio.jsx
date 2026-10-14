import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Slider from "react-slick";
import { Fancybox } from "@fancyapps/ui";
import "@fancyapps/ui/dist/fancybox/fancybox.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";


const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-image skeleton"></div>
    <div className="skeleton-title skeleton" style={{ marginTop: '1rem' }}></div>
    <div className="skeleton-text skeleton" style={{ marginTop: '0.75rem' }}></div>
  </div>
);

const Portfolio = () => {
  const [visibleCertCount, setVisibleCertCount] = useState(6);
  const [loading, setLoading] = useState(true);

  const [projects, setProjects] = useState([]);
  const [certificates, setCertificates] = useState([]);

  useEffect(() => {

    Fancybox.bind('[data-fancybox]:not(.slick-cloned [data-fancybox])', {
      groupAll: false,
      Toolbar: { display: { left: [], middle: [], right: ['close'] } },
    });

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
      } catch (err) {
        console.error('Error fetching portfolio data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      Fancybox.destroy();
    };
  }, []);

  const sliderSettings = {
    dots: true,
    infinite: projects.length > 3,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    lazyLoad: 'progressive',
    autoplay: true,
    autoplaySpeed: 5000,
    pauseOnHover: true,
    pauseOnFocus: true,
    pauseOnDotsHover: true,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 2, infinite: projects.length > 2 } },
      { breakpoint: 640, settings: { slidesToShow: 1, arrows: false, infinite: projects.length > 1 } }
    ]
  };

  return null;
};

export default Portfolio;
