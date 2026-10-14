// Pelacak kesiapan halaman: preloader menunggu semua data/gambar penting selesai dimuat.
// Alur: main.jsx memanggil expect(...) untuk halaman aktif, tiap komponen memanggil markReady(nama)
// setelah datanya selesai (berhasil maupun gagal), lalu preloader menunggu whenDataReady().
const state = new Map();
const listeners = new Set();

const allReady = () => [...state.values()].every(Boolean);
const notify = () => { if (allReady()) { listeners.forEach((fn) => fn()); listeners.clear(); } };

export const expect = (...names) => names.forEach((n) => { if (!state.has(n)) state.set(n, false); });

export const markReady = (name) => {
  if (state.has(name) && !state.get(name)) { state.set(name, true); notify(); }
};

export const whenDataReady = (maxMs = 10000) => new Promise((resolve) => {
  if (allReady()) { resolve(); return; }
  const timer = setTimeout(() => { listeners.delete(done); resolve(); }, maxMs);
  const done = () => { clearTimeout(timer); resolve(); };
  listeners.add(done);
});

// Pra-muat gambar; selesai saat semua termuat/gagal, atau setelah batas waktu
export const preloadImages = (urls, maxMs = 6000) => Promise.race([
  Promise.all(urls.filter(Boolean).map((u) => new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = resolve;
    img.src = u;
  }))),
  new Promise((resolve) => setTimeout(resolve, maxMs)),
]);
