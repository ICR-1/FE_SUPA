import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { markReady } from '../utils/readiness';
import { assetUrl } from '../utils/assets';
import { ICONS } from './socialIcons';
import './gamersite.css';

/* ───────────────────────── data ───────────────────────── */
const MC_UUID = '53fbc8a2-558e-4dc4-9c4d-db53d94c356d';
const RBX_ID = '3064623320';
const GENSHIN_UID = '842517413';
const HSR_UID = '834146257';
const ZZZ_UID = '1311474238';
const DISCORD_ID = '611777485847396354';
// Tautan profil Discord memakai ID numerik (URL berbasis username tidak dikenali Discord)
const DISCORD_URL = `https://discord.com/users/${DISCORD_ID}`;
const MC_COMBO = 'https://mc-heads.net/combo/c88cb06edd1b7775b0cd4c634575f7586ef167962a5c321d1e7da0b0fe71c52b/200';

const callProxy = async (kind, id) => {
  const { data, error } = await supabase.functions.invoke('proxy', { body: { kind, id } });
  if (error) {
    console.error(`proxy ${kind} failed`, error);
    return {};
  }
  return data ?? {};
};

const SOCIALS = [
  { key: 'github', label: 'GitHub', href: 'https://github.com/ICR-1', evenodd: true },
  { key: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/fer.overdose', evenodd: true },
  { key: 'youtube', label: 'YouTube', href: 'https://www.youtube.com/@Aufer', evenodd: true },
  { key: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/in/auferwaker/', evenodd: true },
];

/* ───────────────────────── hooks & efek ───────────────────────── */
// Ketik lalu hapus bergantian
const useTypewriter = (list) => {
  const [text, setText] = useState('');
  const key = list.join('|');
  useEffect(() => {
    if (!list.length) return undefined;
    let i = 0, j = 0, del = false, timer;
    const tick = () => {
      const cur = list[i];
      if (!del) {
        j += 1;
        setText(cur.slice(0, j));
        if (j >= cur.length) { del = true; timer = setTimeout(tick, 1700); return; }
        timer = setTimeout(tick, 70);
      } else {
        j -= 1;
        setText(cur.slice(0, j));
        if (j <= 0) { del = false; i = (i + 1) % list.length; timer = setTimeout(tick, 350); return; }
        timer = setTimeout(tick, 32);
      }
    };
    timer = setTimeout(tick, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return text;
};

// Latar: partikel melayang + garis ke kursor + jejak kursor
const ParticleField = () => {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0, raf = 0, pts = [];
    const mouse = { x: -9999, y: -9999 };
    const trail = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(110, Math.floor((w * h) / 14000));
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 1.4 + 0.4,
      }));
    };
    const onMove = (e) => {
      mouse.x = e.clientX; mouse.y = e.clientY;
      trail.push({ x: e.clientX, y: e.clientY, life: 1 });
      if (trail.length > 26) trail.shift();
    };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (!reduce) {
          p.x += p.vx; p.y += p.vy;
          const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < 120 * 120 && d2 > 1) { const f = (1 - Math.sqrt(d2) / 120) * 0.6; p.x += (dx / Math.sqrt(d2)) * f; p.y += (dy / Math.sqrt(d2)) * f; }
          if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
          if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
        }
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j], dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy);
          if (d < 115) {
            ctx.strokeStyle = `rgba(255,255,255,${(1 - d / 115) * 0.16})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
        const md = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        if (md < 170) {
          ctx.strokeStyle = `rgba(129,140,248,${(1 - md / 170) * 0.55})`;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }
      for (let i = trail.length - 1; i >= 0; i--) {
        const t = trail[i];
        t.life -= 0.04;
        if (t.life <= 0) { trail.splice(i, 1); continue; }
        ctx.fillStyle = `rgba(165,180,252,${t.life * 0.5})`;
        ctx.beginPath(); ctx.arc(t.x, t.y, 1 + t.life * 3.5, 0, Math.PI * 2); ctx.fill();
      }
    };

    resize();
    frame();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, []);
  return <canvas ref={ref} className="gs-canvas" aria-hidden="true" />;
};

const Skeleton = ({ w = '100%', h = 16, style }) => <div className="gs-skeleton" style={{ width: w, height: h, ...style }} />;

const ExternalIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
);
const CopyIcon = () => (
  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
);

/* ───────────────────────── komponen ───────────────────────── */
const GamerSite = () => {
  const [mcData, setMcData] = useState(null);
  const [rbxData, setRbxData] = useState(null);
  const [genshinData, setGenshinData] = useState(null);
  const [hsrData, setHsrData] = useState(null);
  const [zzzData, setZzzData] = useState(null);
  const [discordData, setDiscordData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [musicDone, setMusicDone] = useState(false);
  const [entered, setEntered] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [prevVolume, setPrevVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [musicData, setMusicData] = useState(null);
  const [tab, setTab] = useState(0);
  const [toast, setToast] = useState('');
  const audioRef = useRef(null);
  const isExitingRef = useRef(false);
  const loadingRef = useRef(true);
  const avatarUrlRef = useRef(null);
  const cardRef = useRef(null);
  const tabsRef = useRef(null);
  const tabEls = useRef([]);
  const [pill, setPill] = useState({ x: 0, w: 0 });
  const toastTimer = useRef(null);

  useEffect(() => { loadingRef.current = loading; }, [loading]);
  // Preloader (index.html) menunggu data profil game + musik sebelum membuka halaman
  const siteReady = !loading && musicDone;
  useEffect(() => { if (siteReady) markReady('gamer'); }, [siteReady]);
  useEffect(() => {
    const av = discordData?.discord_user?.avatar;
    avatarUrlRef.current = av ? `https://cdn.discordapp.com/avatars/${DISCORD_ID}/${av}.png?size=256` : null;
  }, [discordData]);

  /* ── musik ── */
  useEffect(() => {
    let isMounted = true;
    const initMusic = async () => {
      try {
        let { data, error } = await supabase.from('musics').select('*').eq('is_active', true).maybeSingle();
        if (error) throw error;
        if (!data) {
          ({ data, error } = await supabase.from('musics').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle());
          if (error) throw error;
        }
        if (!data) throw new Error('Music not found');
        if (!isMounted) return;
        setMusicData(data);
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; audioRef.current.load(); }
        const audio = new Audio(assetUrl(data.file_path));
        audio.loop = true;
        audio.volume = 1;
        if (!isMounted) { audio.pause(); audio.src = ''; return; }
        audioRef.current = audio;
      } catch (e) {
        console.error('Failed to fetch active music:', e);
      } finally {
        if (isMounted) setMusicDone(true);
      }
    };
    initMusic();
    return () => {
      isMounted = false;
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; audioRef.current.load(); audioRef.current = null; }
    };
  }, []);

  const handleEnter = useCallback(async () => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    setIsExiting(true);
    if (audioRef.current) {
      audioRef.current.play().catch((err) => console.warn('Autoplay blocked or failed:', err));
      setIsPlaying(true);
    }
    await new Promise((r) => setTimeout(r, 800));
    while (loadingRef.current) await new Promise((r) => setTimeout(r, 100));
    // Pra-muat avatar agar animasi masuk tidak tersendat saat gambar baru diunduh
    const avatar = avatarUrlRef.current;
    if (avatar) {
      await Promise.race([
        new Promise((r) => { const im = new Image(); im.onload = r; im.onerror = r; im.src = avatar; }),
        new Promise((r) => setTimeout(r, 1500)),
      ]);
    }
    setEntered(true);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Enter') handleEnter(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleEnter]);

  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause(); else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };
  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0) setIsMuted(false);
    if (audioRef.current) audioRef.current.volume = val;
  };
  const toggleMute = () => {
    if (isMuted) {
      setVolume(prevVolume);
      if (audioRef.current) audioRef.current.volume = prevVolume;
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      setVolume(0);
      if (audioRef.current) audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  /* ── ambil data profil ── */
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [mc, rbx, genshin, hsr, zzz, discord] = await Promise.all([
          callProxy('minecraft', MC_UUID),
          callProxy('roblox-avatar', RBX_ID),
          callProxy('genshin', GENSHIN_UID),
          callProxy('hsr', HSR_UID),
          callProxy('zzz', ZZZ_UID),
          callProxy('discord', DISCORD_ID),
        ]);
        setMcData(mc);
        setRbxData({
          username: rbx.username || 'Unknown',
          displayName: rbx.displayName,
          headshotUrl: rbx.headshotUrl,
          followerCount: rbx.followerCount,
          friendCount: rbx.friendCount,
        });
        setGenshinData(genshin);
        setHsrData(hsr);
        setZzzData(zzz);
        setDiscordData(discord?.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    run();
  }, []);

  /* ── salin ke clipboard + toast ── */
  const copy = (value, message) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1800);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  /* ── efek tilt kartu ── */
  const onStageMove = (e) => {
    const el = cardRef.current;
    if (!el || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--ry', `${(px * 9).toFixed(2)}deg`);
    el.style.setProperty('--rx', `${(-py * 7).toFixed(2)}deg`);
  };
  const onStageLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--rx', '0deg');
  };

  /* ── data per game ── */
  const du = discordData?.discord_user;
  const customStatus = discordData?.activities?.find((a) => a.type === 4)?.state;
  const playing = discordData?.activities?.find((a) => a.type === 0);
  const spotify = discordData?.listening_to_spotify ? discordData?.spotify : null;
  const displayName = du?.global_name || du?.username || 'Fer Overdose';

  const games = useMemo(() => {
    const g = genshinData?.playerInfo;
    const h = hsrData?.detailInfo;
    const z = zzzData?.PlayerInfo?.SocialDetail;
    return [
      {
        key: 'minecraft', label: 'Minecraft', color: '#4ade80', ready: true,
        // render "combo" (kepala + badan) dari mc-heads.net; logo sebagai cadangan
        icon: MC_COMBO,
        fullBleed: true,
        fallback: '/images/GamerSites/Minecraft.png',
        name: mcData?.username || '—', sub: 'Java Edition',
        quote: 'Versi server 26.1.2',
        stats: [],
        buttons: [
          { copy: 'mc.aufer.site:25565', text: 'mc.aufer.site:25565', toast: 'IP server disalin' },
          { href: 'https://www.xbox.com/id-ID/play/user/AuferWaker', text: 'Bedrock Edition' },
        ],
      },
      {
        key: 'roblox', label: 'Roblox', color: '#3b82f6', ready: !!rbxData,
        icon: rbxData?.headshotUrl || '/images/GamerSites/Roblox.webp',
        fallback: '/images/GamerSites/Roblox.webp',
        name: rbxData?.displayName || rbxData?.username, sub: `@${rbxData?.username ?? ''}`,
        stats: [{ v: rbxData?.followerCount ?? 0, l: 'Pengikut' }, { v: rbxData?.friendCount ?? 0, l: 'Teman' }],
        buttons: [{ href: `https://www.roblox.com/users/${RBX_ID}/profile`, text: 'Lihat Profil' }],
      },
      {
        key: 'genshin', label: 'Genshin', color: '#f97316', ready: !!g,
        icon: genshinData?.pfpUrl || 'https://enka.network/ui/UI_AvatarIcon_PlayerBoyCostumeCWXR.png',
        name: g?.nickname || 'Traveler', sub: `Adventure Rank ${g?.level ?? 0}`,
        uid: GENSHIN_UID, quote: g?.signature || 'Ad astra abyssosque!',
        stats: [{ v: g?.worldLevel ?? 0, l: 'World Level' }, { v: g?.finishAchievementNum ?? 0, l: 'Achievement' }],
        buttons: [{ href: `https://enka.network/u/${GENSHIN_UID}`, text: 'Enka.Network' }],
      },
      {
        key: 'hsr', label: 'Star Rail', color: '#a855f7', ready: !!h,
        icon: hsrData?.pfpUrl || 'https://enka.network/ui/hsr/SpriteOutput/AvatarRoundIcon/Avatar/1506.png',
        name: h?.nickname || 'Trailblazer', sub: `Trailblaze Level ${h?.level ?? 0}`,
        uid: HSR_UID, quote: h?.signature || 'May this journey lead us starward.',
        stats: [{ v: h?.worldLevel ?? 0, l: 'Equilibrium' }, { v: h?.recordInfo?.achievementCount ?? h?.achievementCount ?? 0, l: 'Achievement' }],
        buttons: [{ href: `https://enka.network/hsr/${HSR_UID}`, text: 'Enka.Network' }],
      },
      {
        key: 'zzz', label: 'ZZZ', color: '#eab308', ready: !!z,
        icon: zzzData?.pfpUrl || 'https://enka.network/ui/zzz/IconInterKnotRole0044.png',
        name: z?.ProfileDetail?.Nickname || 'Proxy', sub: `Inter-Knot Level ${z?.ProfileDetail?.Level ?? 0}`,
        uid: ZZZ_UID, quote: z?.Desc || 'Time to get to work.',
        stats: [],
        buttons: [{ href: `https://enka.network/zzz/${ZZZ_UID}`, text: 'Enka.Network' }],
        dark: true,
      },
      {
        key: 'valorant', label: 'Valorant', color: '#ff4655', ready: true,
        icon: 'https://imgsvc.trackercdn.com/url/size(128),fit(cover)/https%3A%2F%2Ftitles.trackercdn.com%2Fvalorant-api%2Fplayercards%2F7b75be16-4190-34d5-667c-3589418fc7c5%2Fdisplayicon.png/image.jpg',
        name: 'Aufer', sub: '#Waker',
        stats: [{ v: 'PC', l: 'Platform' }, { v: 'APAC', l: 'Region' }],
        buttons: [{ href: 'https://tracker.gg/valorant/profile/riot/Aufer%23Waker/overview', text: 'Tracker.gg' }],
      },
    ];
  }, [mcData, rbxData, genshinData, hsrData, zzzData]);

  const active = games[tab];

  // posisi pil penanda tab
  const measure = useCallback(() => {
    const el = tabEls.current[tab];
    if (el) setPill({ x: el.offsetLeft, w: el.offsetWidth });
  }, [tab]);
  useLayoutEffect(() => { if (entered) measure(); }, [entered, measure, games.length]);
  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);
  useEffect(() => {
    const el = tabEls.current[tab];
    if (el && tabsRef.current) el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [tab]);

  const typingList = useMemo(() => {
    const l = ['Web Developer', '3D Enthusiast', 'IoT Developer'];
    if (customStatus) l.push(`“${customStatus}”`);
    return l;
  }, [customStatus]);
  const typed = useTypewriter(entered ? typingList : []);
  const [showDoors, setShowDoors] = useState(true);
  useEffect(() => {
    if (!entered) return undefined;
    const t = setTimeout(() => setShowDoors(false), 2300); // cadangan jika transisi tidak berjalan
    return () => clearTimeout(t);
  }, [entered]);

  /* ─── HALAMAN UTAMA ─── */
  const avatarSrc = du?.avatar
    ? `https://cdn.discordapp.com/avatars/${DISCORD_ID}/${du.avatar}.png?size=256`
    : 'https://cdn.discordapp.com/embed/avatars/0.png';

  return (
    <div className="gs-root">
      <ParticleField />
      {entered && (
      <>

      <Link to="/" className="gs-back">
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        Kembali ke Beranda
      </Link>

      <div className={`gs-toast ${toast ? 'show' : ''}`} role="status">{toast}</div>

      <main className="gs-page">
        <div className="gs-stage" onPointerMove={onStageMove} onPointerLeave={onStageLeave}>
          <div className="gs-card gs-in" ref={cardRef} style={{ '--i': 0 }}>
            {/* avatar */}
            <div className="gs-avatar-wrap gs-in" style={{ '--i': 1 }}>
              <img className="gs-avatar" src={avatarSrc} alt="Avatar Discord" />
              {du?.avatar && (
                <img className="gs-deco" src="https://cdn.discordapp.com/media/v1/collectibles-shop/1232071712695386162/animated" alt="" />
              )}
              <span className={`gs-status ${discordData?.discord_status || ''}`} title={discordData?.discord_status || 'offline'} />
            </div>

            {/* nama */}
            <div className="gs-name-block gs-in" style={{ '--i': 2 }}>
              <div className="gs-nameplate">
                <video src="https://cdn.discordapp.com/media/v1/collectibles-shop/1349849614198505602/video" autoPlay loop muted playsInline />
              </div>
              <h1 className="gs-name" data-text={displayName}>{displayName}</h1>
              <div className="gs-handle">@{du?.username || 'aufer'}</div>
              <div className="gs-typing" aria-live="off">{typed}<span className="gs-caret" /></div>
            </div>

            {/* chip */}
            <div className="gs-chips gs-in" style={{ '--i': 3 }}>
              <span className="gs-chip"><img src="https://cdn.discordapp.com/clan-badges/558322816416743459/d385a5899fbca1210291199e4615c5a9.png?size=16" alt="" />HOLO</span>
              <span className="gs-chip"><img src="https://cdn3.emoji.gg/emojis/6601-hypesquad-bravery.png" alt="HypeSquad Bravery" title="HypeSquad Bravery" /></span>
              {discordData?.active_on_discord_desktop && <span className="gs-chip"><span className="dot" />Discord Desktop aktif</span>}
              {spotify && <span className="gs-chip spotify"><span className="t">♪ {spotify.song} — {spotify.artist}</span></span>}
              {!spotify && playing && <span className="gs-chip"><span className="t">Bermain {playing.name}</span></span>}
            </div>

            {/* sosial */}
            <div className="gs-socials gs-in" style={{ '--i': 4 }}>
              <a className="gs-social" href={DISCORD_URL} target="_blank" rel="noreferrer noopener" data-label="Discord" aria-label="Profil Discord">
                <svg viewBox="0 0 24 24"><path d={ICONS.discord} /></svg>
              </a>
              {SOCIALS.map((s) => (
                <a key={s.key} className="gs-social" href={s.href} target="_blank" rel="noreferrer noopener" data-label={s.label} aria-label={s.label}>
                  <svg viewBox="0 0 24 24"><path d={ICONS[s.key]} fillRule="evenodd" clipRule="evenodd" /></svg>
                </a>
              ))}
            </div>

            <div className="gs-divider gs-in" style={{ '--i': 5 }} />

            {/* tab game */}
            <div className="gs-in" style={{ '--i': 6 }}>
              <div className="gs-tabs" ref={tabsRef} role="tablist">
                <span className="gs-tab-pill" style={{ transform: `translateX(${pill.x}px)`, width: pill.w, '--c': active.color }} />
                {games.map((g, i) => (
                  <button key={g.key} type="button" role="tab" aria-selected={i === tab}
                    ref={(el) => { tabEls.current[i] = el; }}
                    className={`gs-tab ${i === tab ? 'active' : ''}`}
                    onClick={() => setTab(i)}>
                    {g.label}
                  </button>
                ))}
              </div>

              <div className="gs-panel" key={active.key} style={{ '--c': active.color }}>
                <div className="gs-game-head">
                  <div className="gs-game-icon">
                    {active.ready ? (
                      <img key={active.icon} src={active.icon} alt={active.label} className={active.fullBleed ? 'full' : undefined}
                        onError={(e) => { if (active.fallback && !e.currentTarget.src.endsWith(active.fallback)) e.currentTarget.src = active.fallback; }} />
                    ) : <Skeleton w="100%" h="100%" style={{ borderRadius: 0 }} />}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    {active.ready ? (
                      <>
                        <div className="gs-game-name">{active.name}</div>
                        <div className="gs-game-sub">{active.sub}</div>
                        {active.uid && (
                          <button type="button" className="gs-uid" onClick={() => copy(active.uid, `UID ${active.label} disalin`)}>
                            UID {active.uid} <CopyIcon />
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <Skeleton w="70%" h={22} />
                        <Skeleton w="45%" h={14} style={{ marginTop: 8 }} />
                      </>
                    )}
                  </div>
                </div>

                {active.ready && active.quote && <div className="gs-quote">“{active.quote}”</div>}
                {active.ready && active.stats.length > 0 && (
                  <div className="gs-stats">
                    {active.stats.map((s) => (
                      <div className="gs-stat" key={s.l}><b>{s.v}</b><span>{s.l}</span></div>
                    ))}
                  </div>
                )}
                <div className="gs-actions">
                  {active.buttons.map((b) => (
                    b.href ? (
                      <a key={b.text} className={`gs-btn ${active.dark ? 'dark' : ''}`} href={b.href} target="_blank" rel="noreferrer noopener">
                        {b.text} <ExternalIcon />
                      </a>
                    ) : (
                      <button key={b.text} type="button" className="gs-btn" onClick={() => copy(b.copy, b.toast)}>
                        {b.text} <CopyIcon />
                      </button>
                    )
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* pemutar musik */}
      <div className="gs-player">
        <img className={`gs-disk ${isPlaying ? 'playing' : ''}`}
          src={musicData?.cover_path ? assetUrl(musicData.cover_path) : undefined} alt="" />
        <div className="gs-track">
          <small>Sedang diputar</small>
          <b>{musicData?.title || 'Star Platinum'}</b>
        </div>
        <div className={`gs-eq ${isPlaying ? 'playing' : ''}`} aria-hidden="true"><i /><i /><i /><i /></div>
        <button type="button" className="gs-play" onClick={toggleMusic} aria-label={isPlaying ? 'Jeda' : 'Putar'}>
          {isPlaying ? (
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
          ) : (
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" style={{ marginLeft: 2 }}><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>
        <div className="gs-vol">
          <button type="button" onClick={toggleMute} aria-label="Bisukan">
            {isMuted || volume === 0 ? (
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
            ) : (
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
            )}
          </button>
          <input type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolumeChange} aria-label="Volume" />
        </div>
      </div>
      </>
      )}

      {/* gerbang: dua pintu yang membuka saat ENTER ditekan */}
      {showDoors && (
        <div className={`gs-gate ${isExiting ? 'pressed' : ''} ${entered ? 'open' : ''}`} onClick={siteReady ? handleEnter : undefined} role="button" tabIndex={0} aria-label={siteReady ? "Masuk" : "Memuat"} aria-busy={!siteReady}>
          <div className="gs-door left" />
          <div className="gs-door right" onTransitionEnd={() => { if (entered) setShowDoors(false); }} />
          <div className="gs-seam" />
          <div className="gs-gate-word">{siteReady ? 'ENTER' : 'MEMUAT…'}</div>
        </div>
      )}
    </div>
  );
};

export default GamerSite;
