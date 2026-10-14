import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './legal.css';

const OWNER = 'Ferry Maulana Malik Ibrahim';
const EMAIL = 'ferrymaulanamalikibrahim@gmail.com';
const UPDATED = '14 Oktober 2026';

const DOCS = {
  privacy: {
    title: 'Kebijakan Privasi',
    intro: `Kebijakan ini menjelaskan data apa yang dikumpulkan saat Anda mengunjungi situs portofolio ${OWNER} (aufer.site), untuk apa data itu dipakai, dan bagaimana Anda dapat meminta penghapusannya.`,
    sections: [
      {
        h: '1. Data yang dikumpulkan',
        body: [
          { ul: [
            'Formulir kontak: nama, alamat email, isi pesan, dan waktu pengiriman — hanya jika Anda mengirimnya sendiri.',
            'Data kunjungan (analitik): halaman yang dibuka, jenis perangkat dan peramban, perkiraan lokasi, dan lama kunjungan. Dikumpulkan oleh Google Analytics dengan bantuan cookie.',
            'Data teknis standar seperti alamat IP yang tercatat oleh penyedia hosting dan layanan pihak ketiga ketika halaman dimuat.',
          ] },
          'Situs ini tidak meminta Anda mendaftar, tidak memiliki akun pengunjung, dan tidak menampilkan iklan.',
        ],
      },
      {
        h: '2. Cara data digunakan',
        body: [
          { ul: [
            'Nama, email, dan pesan dipakai semata-mata untuk membaca dan membalas pesan Anda.',
            'Data analitik dipakai untuk memahami halaman mana yang berguna dan memperbaiki situs.',
          ] },
          'Data Anda tidak dijual dan tidak dibagikan untuk keperluan pemasaran.',
        ],
      },
      {
        h: '3. Layanan pihak ketiga',
        body: [
          'Situs ini memakai layanan berikut, yang masing-masing punya kebijakan privasinya sendiri:',
          { ul: [
            'Supabase — menyimpan pesan formulir kontak dan konten situs (proyek, sertifikat, gambar, musik).',
            'Vercel — hosting situs.',
            'Google (Analytics dan Fonts) — analitik kunjungan dan font.',
            'jsDelivr dan cdnjs — pustaka JavaScript dan CSS.',
            'Halaman Gamer Site memuat data dan gambar publik dari Discord (melalui Lanyard), Roblox, Enka.Network, Mojang, dan mc-heads.net. Saat halaman itu dibuka, peramban Anda terhubung ke server layanan tersebut sehingga alamat IP Anda dapat terlihat oleh mereka.',
          ] },
        ],
      },
      {
        h: '4. Cookie dan penyimpanan lokal',
        body: [
          'Google Analytics menyimpan cookie untuk membedakan kunjungan. Anda dapat menolak atau menghapus cookie lewat pengaturan peramban, atau memasang ekstensi pemblokir pelacak; situs tetap dapat dipakai.',
          'Situs juga menyimpan sesi masuk di penyimpanan lokal peramban, tetapi hanya dipakai oleh pemilik situs di halaman admin.',
        ],
      },
      {
        h: '5. Penyimpanan dan penghapusan',
        body: [
          `Pesan disimpan selama masih diperlukan untuk menindaklanjuti percakapan. Anda dapat meminta data Anda dilihat atau dihapus kapan saja dengan menulis ke ${EMAIL}; permintaan akan diproses sesegera mungkin.`,
        ],
      },
      {
        h: '6. Keamanan',
        body: [
          'Data pesan hanya dapat dibaca oleh pemilik situs melalui akun admin, dan koneksi ke situs memakai HTTPS. Meski begitu, tidak ada sistem yang sepenuhnya bebas risiko, sehingga jangan mengirim informasi yang sangat sensitif lewat formulir.',
        ],
      },
      {
        h: '7. Perubahan kebijakan',
        body: ['Kebijakan ini dapat diperbarui sewaktu-waktu. Tanggal pembaruan terakhir tercantum di bagian atas halaman.'],
      },
      {
        h: '8. Kontak',
        body: [`Pertanyaan tentang privasi dapat dikirim ke ${EMAIL}.`],
      },
    ],
  },
  terms: {
    title: 'Syarat & Ketentuan',
    intro: `Dengan mengakses situs portofolio ${OWNER} (aufer.site), Anda menyetujui syarat berikut. Jika tidak setuju, mohon hentikan penggunaan situs ini.`,
    sections: [
      {
        h: '1. Tentang situs',
        body: ['Situs ini adalah portofolio pribadi yang menampilkan profil, proyek, sertifikat, dan halaman pribadi (Gamer Site). Isinya bersifat informasi dan bukan penawaran jasa yang mengikat.'],
      },
      {
        h: '2. Hak kekayaan intelektual',
        body: [
          `Desain, teks, gambar proyek, dan materi lain di situs ini adalah milik ${OWNER} kecuali dinyatakan lain. Logo, nama, dan karya pihak ketiga yang tampil (misalnya sertifikat, logo teknologi, atau data game) adalah milik pemiliknya masing-masing.`,
          'Anda boleh membagikan tautan ke situs ini. Menyalin atau memakai ulang konten untuk keperluan lain memerlukan izin tertulis.',
        ],
      },
      {
        h: '3. Penggunaan yang diperbolehkan',
        body: [
          'Anda setuju untuk tidak:',
          { ul: [
            'mengirim spam, konten melanggar hukum, atau pesan yang bersifat melecehkan lewat formulir kontak;',
            'mengganggu atau membebani situs, termasuk pengambilan data otomatis secara masif;',
            'mencoba mengakses area admin atau data yang bukan hak Anda.',
          ] },
        ],
      },
      {
        h: '4. Formulir kontak',
        body: ['Pesan yang Anda kirim diproses sesuai Kebijakan Privasi. Mengirim pesan tidak menjamin balasan atau terbentuknya kerja sama.'],
      },
      {
        h: '5. Tautan dan layanan pihak ketiga',
        body: ['Situs ini memuat tautan dan data dari pihak ketiga. Pemilik situs tidak mengendalikan dan tidak bertanggung jawab atas isi atau kebijakan mereka.'],
      },
      {
        h: '6. Tanpa jaminan dan batas tanggung jawab',
        body: [
          'Situs disediakan "apa adanya". Pemilik berusaha menjaga informasi tetap akurat, tetapi tidak menjamin situs selalu tersedia, bebas kesalahan, atau datanya selalu mutakhir (termasuk data game yang diambil dari layanan lain).',
          'Sejauh diizinkan hukum, pemilik tidak bertanggung jawab atas kerugian yang timbul dari penggunaan situs ini.',
        ],
      },
      {
        h: '7. Perubahan',
        body: ['Syarat ini dapat diperbarui sewaktu-waktu. Penggunaan situs setelah perubahan berarti Anda menerima syarat yang baru.'],
      },
      {
        h: '8. Hukum yang berlaku dan kontak',
        body: [`Syarat ini tunduk pada hukum Republik Indonesia. Pertanyaan dapat dikirim ke ${EMAIL}.`],
      },
    ],
  },
};

const Legal = ({ type }) => {
  const doc = DOCS[type];
  const other = type === 'privacy' ? { to: '/terms', label: 'Syarat & Ketentuan' } : { to: '/privacy', label: 'Kebijakan Privasi' };

  useEffect(() => {
    document.title = `${doc.title} — Aufer`;
    window.scrollTo(0, 0);
  }, [doc.title]);

  return (
    <main className="legal-page">
      <div className="legal-wrap">
        <Link to="/" className="legal-back">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Kembali ke Beranda
        </Link>

        <header className="legal-head">
          <span className="legal-kicker">Legal</span>
          <h1>{doc.title}</h1>
          <p className="legal-updated">Terakhir diperbarui: {UPDATED}</p>
          <p className="legal-intro">{doc.intro}</p>
        </header>

        {doc.sections.map((s) => (
          <section key={s.h} className="legal-sec">
            <h2>{s.h}</h2>
            {s.body.map((b, i) =>
              typeof b === 'string' ? <p key={i}>{b}</p> : (
                <ul key={i}>{b.ul.map((li) => <li key={li}>{li}</li>)}</ul>
              )
            )}
          </section>
        ))}

        <footer className="legal-foot">
          <span>© {new Date().getFullYear()} {OWNER}</span>
          <Link to={other.to}>{other.label} →</Link>
        </footer>
      </div>
    </main>
  );
};

export default Legal;
