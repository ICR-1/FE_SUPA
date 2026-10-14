# Aufer Site — Portfolio

Portofolio 3D interaktif (Vite + React + Three.js + GSAP) dengan backend Supabase.

## Development

```bash
npm install
cp .env.example .env   # isi nilainya
npm run dev
```

## Environment variables

| Nama | Keterangan |
|---|---|
| `VITE_SUPABASE_URL` | URL project Supabase |
| `VITE_SUPABASE_ANON_KEY` | Publishable / anon key (aman di frontend, dilindungi RLS) |
| `VITE_CAPTCHA_SITE_KEY` | Site key captcha untuk halaman login |

Jangan commit file `.env`. Jangan pernah memakai `service_role` key di frontend.

## Deploy (GitHub → Vercel)

1. Push repo ke GitHub.
2. Di Vercel: **Add New → Project**, pilih repo. Framework preset: **Vite** (build `npm run build`, output `dist`).
3. Isi ketiga environment variable di atas (Settings → Environment Variables), lalu deploy.
4. `vercel.json` sudah mengarahkan semua route ke `index.html` (SPA).
5. Di Supabase → Authentication → URL Configuration, tambahkan domain Vercel/produksi ke **Site URL** dan **Redirect URLs**.

## Database

Migrasi ada di `supabase/migrations/` (urut 0001–0006). Edge Function `proxy` ada di `supabase/functions/proxy`.
