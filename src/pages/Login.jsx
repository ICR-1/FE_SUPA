import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const CAPTCHA_SITE_KEY = import.meta.env.VITE_CAPTCHA_SITE_KEY;
const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

const loadTurnstile = () =>
  new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    let s = document.querySelector(`script[src="${TURNSTILE_SRC}"]`);
    if (!s) {
      s = document.createElement('script');
      s.src = TURNSTILE_SRC;
      s.async = true;
      document.head.appendChild(s);
    }
    s.addEventListener('load', () => resolve(window.turnstile));
    s.addEventListener('error', reject);
  });

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const captchaRef = useRef(null);
  const widgetId = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !captchaRef.current) return;
        widgetId.current = turnstile.render(captchaRef.current, {
          sitekey: CAPTCHA_SITE_KEY,
          theme: 'dark',
          callback: (token) => setCaptchaToken(token),
          'expired-callback': () => setCaptchaToken(''),
          'error-callback': () => setCaptchaToken(''),
        });
      })
      .catch(() => setError('Gagal memuat CAPTCHA'));
    return () => {
      cancelled = true;
      if (widgetId.current != null && window.turnstile) window.turnstile.remove(widgetId.current);
    };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.app_metadata?.role === 'admin') navigate('/dashboard', { replace: true });
    });
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!captchaToken) {
      setError('Silakan selesaikan CAPTCHA');
      setLoading(false);
      return;
    }

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    });

    if (authError) {
      setError(authError.message || 'Login failed');
      if (window.turnstile && widgetId.current != null) window.turnstile.reset(widgetId.current);
      setCaptchaToken('');
    } else if (data.user?.app_metadata?.role !== 'admin') {
      await supabase.auth.signOut();
      setError('Akun ini bukan admin');
    } else {
      navigate('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary px-6">
      <div className="max-w-md w-full bg-tertiary p-10 rounded-2xl shadow-card backdrop-blur-md border border-white/10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white-100">Admin Login</h2>
          <p className="text-secondary mt-2">Masuk untuk mengelola konten</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-secondary mb-2 text-sm">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black-200 text-white-100 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all border border-white/5"
              placeholder="Masukkan email"
              required
            />
          </div>
          <div>
            <label className="block text-secondary mb-2 text-sm">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black-200 text-white-100 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all border border-white/5"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="flex justify-center my-4">
            <div ref={captchaRef}></div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
        
        <div className="mt-8 text-center">
          <button onClick={() => navigate('/')} className="text-secondary hover:text-white-100 text-sm transition-all">
            ← Kembali ke Website
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
