import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { assetUrl } from '../utils/assets';

const TABLE = { projects: 'projects', certificates: 'certificates', skills: 'skills', profile: 'profiles', musics: 'musics', messages: 'contacts' };
const BUCKET = { projects: 'projek', certificates: 'sertif', skills: 'skills', profile: 'profile', musics: 'music' };
// Kolom yang boleh dikirim ke tabel (menggantikan whitelist di handler Go)
const COLUMNS = {
  projects: ['title', 'description', 'tags', 'link'],
  certificates: ['title'],
  skills: ['name'],
  profile: ['description', 'cv_url1', 'cv_url2'],
  musics: ['title', 'artist'],
};

const swalBase = { background: '#151030', color: '#fff' };

const REORDERABLE = ['projects', 'certificates', 'skills'];
const MAX_IMAGE_MB = 5;
const MAX_AUDIO_MB = 20;
const LABEL = { projects: 'Projects', certificates: 'Certificates', skills: 'Tech Stack', profile: 'About Me', musics: 'Music', messages: 'Pesan' };
const TABS = ['projects', 'certificates', 'skills', 'profile', 'musics', 'messages'];
const ICON = {
  projects: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z',
  certificates: 'M12 15a6 6 0 100-12 6 6 0 000 12zm-3 .5L7.5 21l4.5-2.5 4.5 2.5L15 15.5',
  skills: 'M8 9l-4 3 4 3m8-6l4 3-4 3m-3-9l-2 12',
  profile: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0',
  musics: 'M9 18V6l10-2v12M9 18a3 3 0 11-6 0 3 3 0 016 0zm10-2a3 3 0 11-6 0 3 3 0 016 0z',
  messages: 'M4 6h16v12H4zM4 7l8 6 8-6',
};

const Icon = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

const toast = (icon, title) => Swal.fire({ icon, title, ...swalBase, timer: 1600, showConfirmButton: false, toast: true, position: 'top-end' });

// Area drag & drop (atau klik) untuk memilih file; menampilkan preview gambar / nama file audio
const DropZone = ({ kind = 'image', file, currentUrl, onFile, label, hint }) => {
  const [over, setOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const inputRef = useRef(null);
  const isImage = kind === 'image';
  const maxMB = isImage ? MAX_IMAGE_MB : MAX_AUDIO_MB;

  useEffect(() => {
    if (!file || !isImage) { setPreview(null); return undefined; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  const accept = (f) => {
    if (!f) return;
    const okType = isImage ? f.type.startsWith('image/') : (f.type === 'audio/mpeg' || /\.mp3$/i.test(f.name));
    if (!okType) return toast('error', isImage ? 'File harus berupa gambar' : 'File harus berformat .mp3');
    if (f.size > maxMB * 1024 * 1024) return toast('error', `Ukuran maksimal ${maxMB} MB`);
    onFile(f);
  };

  const shown = preview || (isImage && currentUrl ? assetUrl(currentUrl) : null);

  return (
    <div>
      <label className="block text-secondary mb-1 text-sm">{label}</label>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); accept(e.dataTransfer.files?.[0]); }}
        className={`relative rounded-xl border-2 border-dashed cursor-pointer transition-all text-center overflow-hidden ${over ? 'border-blue-500 bg-blue-500/10' : 'border-white/15 hover:border-blue-500/50 bg-black-200'}`}
      >
        {shown ? (
          <div className="relative h-40">
            <img src={shown} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/55 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-sm">Klik atau seret untuk mengganti</div>
          </div>
        ) : (
          <div className="py-8 px-4 text-secondary">
            <div className="mx-auto mb-2 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-blue-400">
              <Icon d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" size={20} />
            </div>
            <p className="text-sm"><span className="text-blue-400 font-medium">Klik untuk pilih</span> atau seret file ke sini</p>
            <p className="text-xs mt-1 opacity-70">{hint || (isImage ? `PNG, JPG, WEBP · maks ${maxMB} MB` : `MP3 · maks ${maxMB} MB`)}</p>
          </div>
        )}
        <input ref={inputRef} type="file" hidden accept={isImage ? 'image/*' : 'audio/mpeg,.mp3'} onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      {file && (
        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-secondary bg-white/5 rounded-lg px-3 py-2">
          <span className="truncate">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</span>
          <button type="button" onClick={() => onFile(null)} className="text-red-400 hover:text-red-300 shrink-0">Hapus</button>
        </div>
      )}
      {!file && !isImage && currentUrl && <p className="text-xs text-blue-400 mt-2 truncate">File saat ini dipakai jika tidak diganti</p>}
    </div>
  );
};

const inputCls = 'w-full bg-black-200 px-4 py-3 rounded-xl border border-white/5 focus:border-blue-500/60 focus:outline-none transition-colors';
const Field = ({ label, children }) => (
  <div>
    <label className="block text-secondary mb-1 text-sm">{label}</label>
    {children}
  </div>
);

// Ambil nama objek dari URL publik Storage; null jika bukan file di bucket tsb (mis. URL devicon / aset statis)
const storageName = (url, bucket) => {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url ? url.indexOf(marker) : -1;
  return idx === -1 ? null : decodeURIComponent(url.slice(idx + marker.length).split('?')[0]);
};

const removeFile = async (url, bucket) => {
  const name = storageName(url, bucket);
  if (name) await supabase.storage.from(bucket).remove([name]);
};

const uploadFile = async (file, bucket) => {
  const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : 'bin';
  const name = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(name, file, { cacheControl: '31536000', contentType: file.type || undefined });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(name).data.publicUrl;
};

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('projects');
  const [data, setData] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [query, setQuery] = useState('');
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const navigate = useNavigate();

  // Form states
  const [formData, setFormData] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedAudio, setSelectedAudio] = useState(null);

  const reorderable = REORDERABLE.includes(activeTab);

  // Guard: hanya sesi admin yang boleh masuk
  useEffect(() => {
    const check = (session) => {
      if (session?.user?.app_metadata?.role === 'admin') setAuthReady(true);
      else navigate('/login', { replace: true });
    };
    supabase.auth.getSession().then(({ data }) => check(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate('/login', { replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!authReady) return;
    fetchData();
    setQuery('');
    setIsMobileMenuOpen(false); // Close menu on tab change
  }, [activeTab, authReady]);

  // Jumlah data per tab untuk lencana di sidebar
  const fetchCounts = async () => {
    const entries = await Promise.all(TABS.map(async (t) => {
      const { count } = await supabase.from(TABLE[t]).select('*', { count: 'exact', head: true });
      return [t, count ?? 0];
    }));
    setCounts(Object.fromEntries(entries));
  };
  useEffect(() => { if (authReady) fetchCounts(); }, [authReady]);

  // Esc menutup modal
  useEffect(() => {
    if (!isModalOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !saving) closeModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isModalOpen, saving]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let q = supabase.from(TABLE[activeTab]).select('*');
      if (activeTab === 'musics' || activeTab === 'messages') q = q.order('created_at', { ascending: false });
      else if (REORDERABLE.includes(activeTab)) q = q.order('position', { nullsFirst: false }).order('created_at');
      else if (activeTab !== 'profile') q = q.order('created_at');
      const { data: rows, error } = await q;
      if (error) throw error;
      setData(rows || []);
      setCounts((c) => ({ ...c, [activeTab]: (rows || []).length }));
    } catch (err) {
      console.error('Fetch error:', err);
      toast('error', 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Logout?',
      text: 'Yakin ingin mengakhiri sesi?',
      icon: 'question',
      showCancelButton: true,
      ...swalBase,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Logout',
      cancelButtonText: 'Batal',
    });
    if (result.isConfirmed) {
      await supabase.auth.signOut();
      navigate('/login');
    }
  };

  const handleDelete = async (id) => {
    const item = data.find((d) => d.id === id);
    const name = item?.name || item?.title || 'item ini';
    const result = await Swal.fire({
      title: 'Hapus data?',
      html: `<b>${String(name).replace(/[<>&]/g, '')}</b> akan dihapus permanen.`,
      icon: 'warning',
      showCancelButton: true,
      ...swalBase,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, hapus',
      cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;

    try {
      const { error } = await supabase.from(TABLE[activeTab]).delete().eq('id', id);
      if (error) throw error;
      // Hapus file Storage setelah baris terhapus agar tidak ada baris yatim jika delete ditolak
      if (item) {
        await removeFile(item.image_path, BUCKET[activeTab]);
        await removeFile(item.cover_path, BUCKET[activeTab]);
        await removeFile(item.file_path, BUCKET[activeTab]);
      }
      toast('success', 'Data dihapus');
      fetchData();
    } catch (err) {
      console.error('Delete error:', err);
      Swal.fire({ title: 'Error!', text: err.message || 'Delete failed', icon: 'error', ...swalBase });
    }
  };

  const handleSetActive = async (id) => {
    const { error } = await supabase.rpc('set_active_music', { p_id: id });
    if (error) {
      console.error('Set active error:', error);
      Swal.fire({ title: 'Error!', text: error.message, icon: 'error', ...swalBase });
      return;
    }
    toast('success', 'Musik diaktifkan');
    fetchData();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditItem(null);
    setFormData({});
    setSelectedFile(null);
    setSelectedAudio(null);
  };

  const openCreate = () => {
    setEditItem(null);
    setFormData({});
    setSelectedFile(null);
    setSelectedAudio(null);
    setIsModalOpen(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setFormData(item);
    setSelectedFile(null);
    setSelectedAudio(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const bucket = BUCKET[activeTab];
    const table = TABLE[activeTab];
    const uploaded = [];
    const staleUrls = [];
    setSaving(true);

    try {
      const payload = {};
      COLUMNS[activeTab].forEach((k) => { if (formData[k] !== undefined) payload[k] = formData[k]; });
      if (activeTab === 'projects' && payload.link !== undefined) {
        payload.link = (payload.link ?? '').trim() || null; // opsional: kosong = tanpa link
      }

      // Upload file baru; file lama dihapus setelah penyimpanan baris berhasil
      const track = async (file, column) => {
        const url = await uploadFile(file, bucket);
        uploaded.push(url);
        if (editItem?.[column]) staleUrls.push(editItem[column]);
        payload[column] = url;
      };
      if (activeTab === 'musics') {
        if (!editItem && !selectedAudio) throw new Error('File musik (.mp3) wajib diisi.');
        if (selectedFile) await track(selectedFile, 'cover_path');
        if (selectedAudio) await track(selectedAudio, 'file_path');
      } else if (selectedFile) {
        await track(selectedFile, 'image_path');
      }

      let error;
      if (activeTab === 'profile') {
        ({ error } = await supabase.from(table).upsert({ id: 1, ...payload }));
      } else if (editItem) {
        ({ error } = await supabase.from(table).update(payload).eq('id', editItem.id));
      } else {
        // Item baru masuk di urutan paling akhir
        if (reorderable) payload.position = data.reduce((m, d) => Math.max(m, d.position ?? -1), -1) + 1;
        ({ error } = await supabase.from(table).insert(payload));
      }
      if (error) throw error;

      await Promise.all(staleUrls.map((u) => removeFile(u, bucket)));

      toast('success', editItem ? 'Data diperbarui' : 'Data ditambahkan');
      closeModal();
      fetchData();
    } catch (err) {
      console.error('Submit error:', err);
      // Bersihkan upload yatim jika penyimpanan baris gagal
      await Promise.all(uploaded.map((u) => removeFile(u, bucket)));
      Swal.fire({ title: 'Error!', text: err.message || 'Something went wrong', icon: 'error', ...swalBase });
    } finally {
      setSaving(false);
    }
  };

  // ----- Drag & drop urutan -----
  const handleReorderDrop = async (targetId) => {
    const from = data.findIndex((d) => d.id === dragId);
    const to = data.findIndex((d) => d.id === targetId);
    setDragId(null);
    setOverId(null);
    if (from < 0 || to < 0 || from === to) return;

    const next = [...data];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const prev = data;
    setData(next.map((d, i) => ({ ...d, position: i })));

    try {
      const results = await Promise.all(
        next.map((d, i) => (d.position === i ? null : supabase.from(TABLE[activeTab]).update({ position: i }).eq('id', d.id)))
      );
      const failed = results.find((r) => r?.error);
      if (failed) throw failed.error;
      toast('success', 'Urutan disimpan');
    } catch (err) {
      console.error('Reorder error:', err);
      setData(prev);
      toast('error', 'Gagal menyimpan urutan');
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((d) => [d.title, d.name, d.tags, d.artist, d.description, d.email, d.message].some((v) => v && String(v).toLowerCase().includes(q)));
  }, [data, query]);

  const canAdd = activeTab !== 'messages' && (activeTab !== 'profile' || data.length === 0);
  const canDrag = reorderable && !query.trim() && filtered.length > 1;

  if (!authReady) return null;

  const pageTitle = activeTab === 'messages' ? 'Pesan Masuk' : `Manage ${LABEL[activeTab]}`;
  const imageOf = (item) => (activeTab === 'musics' ? item.cover_path : item.image_path);

  return (
    <div className="min-h-screen bg-primary text-white-100 flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-tertiary border-b border-white/10 sticky top-0 z-40">
        <h2 className="text-xl font-bold text-blue-500">Aufer Admin</h2>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-secondary hover:text-white" aria-label="Menu">
          {isMobileMenuOpen ? (
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
          ) : (
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16m-7 6h7"/></svg>
          )}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky md:top-0 z-50 w-64 bg-tertiary border-r border-white/10 p-6 flex flex-col h-full md:h-screen transition-transform duration-300
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <h2 className="text-2xl font-bold mb-1 text-blue-500 hidden md:block">Aufer Admin</h2>
        <p className="text-xs text-secondary mb-8 hidden md:block">Kelola konten portofolio</p>
        <nav className="flex-1 space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
                activeTab === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-secondary hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon d={ICON[tab]} />
              <span className="flex-1">{LABEL[tab]}</span>
              {counts[tab] !== undefined && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab ? 'bg-white/20' : 'bg-white/5'}`}>{counts[tab]}</span>
              )}
            </button>
          ))}
        </nav>
        <a href="/" target="_blank" rel="noopener noreferrer" className="mb-3 w-full text-center text-sm text-secondary hover:text-white py-2 rounded-xl hover:bg-white/5 transition-all">Lihat Website ↗</a>
        <button onClick={handleLogout} className="w-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white py-3 rounded-xl transition-all">
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 min-w-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{pageTitle}</h1>
            {canDrag && <p className="text-xs text-secondary mt-1">Seret kartu untuk mengubah urutan tampil di website.</p>}
          </div>
          {canAdd && (
            <button onClick={openCreate} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-medium transition-all">
              {activeTab === 'profile' ? 'Isi About Me' : '+ Add New'}
            </button>
          )}
        </div>

        {activeTab !== 'profile' && data.length > 0 && (
          <div className="relative mb-6 max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary"><Icon d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" /></span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari…" className={`${inputCls} pl-10`} />
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => <div key={i} className="bg-tertiary rounded-2xl h-64 animate-pulse border border-white/5" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-secondary border border-dashed border-white/10 rounded-2xl">
            <p className="mb-4">{query ? 'Tidak ada hasil yang cocok.' : activeTab === 'messages' ? 'Belum ada pesan masuk.' : 'Belum ada data.'}</p>
            {!query && canAdd && <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm">+ Tambah sekarang</button>}
          </div>
        ) : activeTab === 'messages' ? (
          <div className="space-y-4">
            {filtered.map((m) => (
              <div key={m.id} className="bg-tertiary rounded-2xl border border-white/5 p-5 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-lg break-words">{m.name || '(tanpa nama)'}</h3>
                    <a href={`mailto:${m.email}`} className="text-blue-400 hover:underline text-sm break-all">{m.email}</a>
                  </div>
                  <span className="text-secondary text-xs whitespace-nowrap">
                    {new Date(m.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                {m.message && <p className="mt-4 text-white/85 whitespace-pre-wrap break-words leading-relaxed">{m.message}</p>}
                <div className="mt-4 flex gap-3">
                  <a href={`mailto:${m.email}?subject=${encodeURIComponent('Balasan dari Ferry')}`} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-medium transition-colors">Balas</a>
                  <button onClick={() => handleDelete(m.id)} className="px-4 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white text-sm font-medium transition-colors">Hapus</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <div
                key={item.id}
                draggable={canDrag}
                onDragStart={(e) => { setDragId(item.id); e.dataTransfer.effectAllowed = 'move'; }}
                onDragOver={(e) => { if (canDrag && dragId) { e.preventDefault(); if (overId !== item.id) setOverId(item.id); } }}
                onDrop={(e) => { e.preventDefault(); if (canDrag && dragId) handleReorderDrop(item.id); }}
                onDragEnd={() => { setDragId(null); setOverId(null); }}
                className={`bg-tertiary rounded-2xl overflow-hidden border transition-all group ${
                  dragId === item.id ? 'opacity-40 scale-95 border-blue-500/50' : overId === item.id && dragId ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-white/5 hover:border-blue-500/30'
                } ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
              >
                <div className="h-40 bg-black-200 relative overflow-hidden">
                  {imageOf(item) ? (
                    <img src={assetUrl(imageOf(item))} alt={item.name || item.title || 'Profile'} draggable={false} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-secondary text-sm">Tanpa gambar</div>
                  )}
                  {canDrag && (
                    <div className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/60 text-white/80" title="Seret untuk mengurutkan">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="5" cy="3" r="1.3"/><circle cx="11" cy="3" r="1.3"/><circle cx="5" cy="8" r="1.3"/><circle cx="11" cy="8" r="1.3"/><circle cx="5" cy="13" r="1.3"/><circle cx="11" cy="13" r="1.3"/></svg>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-2">
                    {activeTab === 'musics' && (
                      <button
                        onClick={() => handleSetActive(item.id)}
                        className={`p-2 rounded-lg shadow-lg ${item.is_active ? 'bg-green-600' : 'bg-gray-600 hover:bg-green-500'}`}
                        title={item.is_active ? 'Active' : 'Set Active'}
                      >
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M12.736 3.97a.733.733 0 0 1 1.032 0c.285.285.285.747 0 1.032l-7 7a.733.733 0 0 1-1.031 0l-3.5-3.5a.733.733 0 0 1 1.031-1.031l2.984 2.984 6.484-6.484z"/></svg>
                      </button>
                    )}
                    <button onClick={() => openEdit(item)} className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg shadow-lg" title="Edit"><svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.499.499 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11l.178-.178z"/></svg></button>
                    {activeTab !== 'profile' && (
                      <button onClick={() => handleDelete(item.id)} className="p-2 bg-red-600 hover:bg-red-500 rounded-lg shadow-lg" title="Hapus"><svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg></button>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-lg truncate">{activeTab === 'profile' ? 'My Profile' : (item.name || item.title)}</h3>
                  <p className="text-secondary text-sm mt-1 line-clamp-2">
                    {activeTab === 'profile' ? item.description : (activeTab === 'projects' ? item.tags : activeTab === 'musics' ? item.artist : '')}
                  </p>
                  {activeTab === 'projects' && item.link && (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="mt-3 inline-block max-w-full truncate text-xs text-blue-400 hover:underline">{item.link.replace(/^https?:\/\//, '')} ↗</a>
                  )}
                  {activeTab === 'musics' && (
                    <div className="mt-4 p-2 bg-black-200 rounded-lg text-xs font-mono truncate text-blue-400">{item.file_path}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) closeModal(); }}>
          <div className="bg-tertiary w-full max-w-lg rounded-2xl p-6 md:p-8 border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {activeTab === 'profile' ? 'Update About Me' : `${editItem ? 'Edit' : 'Add New'} ${LABEL[activeTab]}`}
              </h2>
              <button type="button" onClick={closeModal} disabled={saving} className="text-secondary hover:text-white p-1" aria-label="Tutup">
                <Icon d="M6 18L18 6M6 6l12 12" size={22} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === 'profile' ? (
                <>
                  <Field label="Description">
                    <textarea className={`${inputCls} min-h-[120px]`} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} required />
                  </Field>
                  <Field label="CV Link 1">
                    <input type="text" className={inputCls} value={formData.cv_url1 || ''} onChange={e => setFormData({...formData, cv_url1: e.target.value})} />
                  </Field>
                  <Field label="CV Link 2">
                    <input type="text" className={inputCls} value={formData.cv_url2 || ''} onChange={e => setFormData({...formData, cv_url2: e.target.value})} />
                  </Field>
                </>
              ) : activeTab === 'skills' ? (
                <Field label="Tech Name">
                  <input type="text" className={inputCls} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </Field>
              ) : activeTab === 'musics' ? (
                <>
                  <Field label="Music Title">
                    <input type="text" className={inputCls} value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} required />
                  </Field>
                  <Field label="Artist">
                    <input type="text" className={inputCls} value={formData.artist || ''} onChange={e => setFormData({...formData, artist: e.target.value})} required />
                  </Field>
                  <DropZone kind="audio" label="Music File (.mp3)" file={selectedAudio} currentUrl={editItem?.file_path} onFile={setSelectedAudio} />
                </>
              ) : (
                <>
                  <Field label="Title">
                    <input type="text" className={inputCls} value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} required />
                  </Field>
                  {activeTab === 'projects' && (
                    <>
                      <Field label="Description">
                        <textarea className={`${inputCls} min-h-[90px]`} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                      </Field>
                      <Field label="Tags (Comma separated)">
                        <input type="text" className={inputCls} value={formData.tags || ''} onChange={e => setFormData({...formData, tags: e.target.value})} placeholder="e.g. React, Three.js, GSAP" />
                      </Field>
                      <Field label="Link Projek (opsional)">
                        <input type="url" pattern="https?://.+" className={inputCls} value={formData.link || ''} onChange={e => setFormData({...formData, link: e.target.value})} placeholder="https://contoh.com" />
                      </Field>
                    </>
                  )}
                </>
              )}

              <DropZone
                kind="image"
                label={activeTab === 'musics' ? 'Cover Image' : 'Image'}
                file={selectedFile}
                currentUrl={editItem ? imageOf(editItem) : null}
                onFile={setSelectedFile}
              />

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={closeModal} disabled={saving} className="flex-1 bg-white/5 hover:bg-white/10 py-3 rounded-xl disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-bold disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving && <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  {saving ? 'Menyimpan…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
