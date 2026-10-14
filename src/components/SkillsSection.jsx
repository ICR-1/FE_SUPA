import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { markReady } from '../utils/readiness';
import { assetUrl } from '../utils/assets';

const SkillPill = ({ skill }) => (
  <div className="skill-pill">
    <span className="ico">
      <img src={assetUrl(skill.image_path)} alt="" loading="lazy" />
    </span>
    {skill.name}
  </div>
);

// Satu baris marquee: daftar diulang agar cukup panjang, lalu digandakan untuk loop mulus
const MarqueeRow = ({ items, reverse, duration }) => {
  const base = items.length ? Array.from({ length: Math.max(1, Math.ceil(10 / items.length)) }, () => items).flat() : [];
  return (
    <div className={`marquee${reverse ? ' reverse' : ''}`}>
      <div className="marquee-track" style={{ '--dur': `${duration}s` }}>
        {[...base, ...base].map((s, i) => (
          <SkillPill key={`${s.id}-${i}`} skill={s} />
        ))}
      </div>
    </div>
  );
};

const SkillsSection = () => {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const { data, error } = await supabase.from('skills').select('*').order('position', { nullsFirst: false }).order('created_at');
        if (error) throw error;
        setSkills(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        markReady('skills');
      }
    };
    fetchSkills();
  }, []);

  const half = Math.ceil(skills.length / 2);
  const rowA = skills.slice(0, half);
  const rowB = skills.slice(half);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-14">
        <span className="section-eyebrow center">02 · Keahlian</span>
        <h2 className="text-3xl sm:text-4xl font-bold text-white-100 skills-title">
          <span className="animated-underline active">
            Tech Stack
          </span>
        </h2>
        <p className="text-secondary mt-4 max-w-xl mx-auto">
          Bahasa, framework, dan alat yang saya pakai sehari-hari.
        </p>
      </div>

      {loading ? (
        <div className="marquee">
          <div className="marquee-track" style={{ animation: 'none' }}>
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="skill-pill"><span className="ico skeleton"></span><span className="skeleton" style={{ width: 80, height: 14 }}></span></div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <MarqueeRow items={rowA} duration={Math.max(30, rowA.length * 4)} />
          {rowB.length > 0 && <MarqueeRow items={rowB} reverse duration={Math.max(30, rowB.length * 4)} />}
        </>
      )}
    </div>
  );
};

export default SkillsSection;
