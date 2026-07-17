import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogIn, Key, Mail, Shield, User, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured, localDb } from '../lib/supabase';

export default function Login({ onLoginSuccess }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin'); // 'admin' or 'student'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const isDemoAdmin = email === 'admin@atletik.com' && password === 'admin123';
    const isDemoStudent = email === 'ogrenci@atletik.com' && password === '7';

    if (isSupabaseConfigured && !isDemoAdmin && !isDemoStudent) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;

        // Fetch user profile to check role
        const { data: profile, error: profError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profError) throw profError;

        localStorage.setItem('user_role', profile.role);
        localStorage.setItem('user_id', profile.id);

        onLoginSuccess?.(); // App.jsx'teki state'i günceller, ekran anında değişir

        if (profile.role === 'admin') {
          navigate('/');
        } else {
          navigate(`/players/${profile.id}`);
        }
      } catch (err) {
        setError(err.message || 'Giriş yapılamadı.');
      } finally {
        setLoading(false);
      }
    } else {
      // Local Mock DB Auth Mode (or fallback for demo accounts)
      setTimeout(() => {
        setLoading(false);
        if (role === 'admin') {
          if (email === 'admin@atletik.com' && password === 'admin123') {
            localStorage.setItem('user_role', 'admin');
            localStorage.setItem('user_id', 'admin');
            onLoginSuccess?.(); // App.jsx'teki state'i günceller, ekran anında değişir
            navigate('/');
          } else {
            setError('Geçersiz admin bilgileri. (Demo: admin@atletik.com / admin123)');
          }
        } else {
          // Student login: find matching player from localDb profiles/players
          const db = localDb.get();
          const playersList = db.profiles || [];
          const matched = playersList.find(p =>
            (p.email && p.email.toLowerCase() === email.toLowerCase()) &&
            (p.password ? p.password.toString() === password.toString() : p.jerseyNumber?.toString() === password.toString())
          );

          if (matched || (email === 'ogrenci@atletik.com' && password === '7')) {
            localStorage.setItem('user_role', 'student');
            localStorage.setItem('user_id', matched ? matched.id : '1');
            onLoginSuccess?.(); // App.jsx'teki state'i günceller, ekran anında değişir
            navigate(matched ? `/players/${matched.id}` : '/players/1');
          } else {
            setError('Öğrenci bulunamadı. (Demo: ogrenci@atletik.com / şifre: 7)');
          }
        }
      }, 800);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at center, var(--navy3) 0%, var(--navy) 100%)',
      padding: 'var(--space-4)'
    }}>
      <div className="card" style={{
        maxWidth: 400,
        width: '100%',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
        padding: 'var(--space-6)',
        margin: '10px'
      }}>
        {/* Logo/Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-5)' }}>
          <img
            src="/logo1.jpeg"
            alt="Kocaeli Atletik"
            style={{
              width: 88,
              height: 88,
              borderRadius: '50%',
              border: '2px solid var(--c-primary)',
              display: 'block',
              margin: '0 auto var(--space-3)',
              boxShadow: '0 4px 12px rgba(255,107,53,0.3)'
            }}
          />
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.4rem', color: '#fff' }}>
            Basket Sporcu Gelişim
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--c-text-3)', marginTop: 4 }}>
            Sporcu Gelişim Takip Sistemi
          </p>
        </div>

        {/* Role Select tab */}
        <div className="tabs" style={{ marginBottom: 'var(--space-5)' }}>
          <button
            type="button"
            className={`tab-btn${role === 'admin' ? ' active' : ''}`}
            onClick={() => setRole('admin')}
            style={{ flex: 1 }}
          >
            <Shield size={14} /> Admin
          </button>
          <button
            type="button"
            className={`tab-btn${role === 'student' ? ' active' : ''}`}
            onClick={() => setRole('student')}
            style={{ flex: 1 }}
          >
            <User size={14} /> Öğrenci
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: 'var(--c-red)',
              borderRadius: 'var(--r-md)',
              padding: '10px 14px',
              fontSize: '0.75rem',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mail size={12} /> {role === 'admin' ? 'E-posta' : 'Öğrenci E-posta / Kullanıcı Adı'}
            </label>
            <input
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={role === 'admin' ? 'admin@atletik.com' : 'ogrenci@atletik.com'}
              required
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Key size={12} /> {role === 'admin' ? 'Şifre' : 'Forma Numarası (Şifre)'}
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={role === 'admin' ? '••••••' : 'Forma No (örn: 7)'}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '12px',
              marginTop: 'var(--space-2)'
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" style={{ marginRight: 8 }} />
                Giriş Yapılıyor...
              </>
            ) : (
              <>
                <LogIn size={16} style={{ marginRight: 8 }} />
                Giriş Yap
              </>
            )}
          </button>
        </form>

        {!isSupabaseConfigured && (
          <div style={{
            marginTop: 'var(--space-6)',
            textAlign: 'center',
            fontSize: '0.7rem',
            color: 'var(--c-yellow)',
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 'var(--r-md)',
            padding: '8px 12px'
          }}>
            🔌 <strong>Demo Modu:</strong> Veritabanı bağlı değil. <br />
            {role === 'admin' ? 'Giriş: admin@atletik.com / admin123' : 'Giriş: ogrenci@atletik.com / 7'}
          </div>
        )}
      </div>
    </div>
  );
}
