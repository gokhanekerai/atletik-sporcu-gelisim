import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogIn, Key, Mail, Shield, User, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured, localDb } from '../lib/supabase';

export default function Login() {
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
        window.dispatchEvent(new Event('auth-changed'));
        
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
            window.dispatchEvent(new Event('auth-changed'));
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
            window.dispatchEvent(new Event('auth-changed'));
            navigate(matched ? `/players/${matched.id}` : '/players/1');
          } else {
            setError('Öğrenci bulunamadı. (Demo: ogrenci@atletik.com / şifre: 7)');
          }
        }
      }, 800);
    }
  };
  return (
    <div className="login-page-container">
      {/* Scope login-specific styles */}
      <style>{`
        .login-page-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: radial-gradient(circle at center, rgba(6, 9, 19, 0.92) 0%, rgba(6, 9, 19, 0.98) 100%), url('/atleticplus_logo.jpeg') repeat;
          background-size: auto, 90px 90px;
          width: 100%;
          overflow: hidden;
          padding: var(--space-4);
        }

        .login-form-column {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 390px;
          z-index: 10;
          position: relative;
        }

        /* Glassmorphic card - has visual background on both PC and mobile */
        .login-card-glass {
          background: linear-gradient(180deg, rgba(6, 9, 19, 0.6) 0%, rgba(6, 9, 19, 0.9) 100%), url('/login_player_dunk.png') center/cover no-repeat !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.7) !important;
          width: 100%;
          padding: var(--space-6);
          border-radius: var(--r-xl);
        }

        .login-visual-column {
          display: none;
        }

        .hud-overlay {
          position: absolute;
          inset: 0;
          z-index: 3;
          pointer-events: none;
          padding: var(--space-6);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        @media (max-width: 576px) {
          .hud-overlay {
            display: none;
          }
        }

        .hud-top {
          display: flex;
          justify-content: space-between;
          font-family: var(--font-display);
        }

        .hud-bottom {
          display: flex;
          justify-content: space-between;
          font-family: var(--font-display);
        }

        .hud-indicator {
          background: rgba(20, 27, 45, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--r-md);
          padding: 8px 12px;
          backdrop-filter: blur(8px);
          display: flex;
          flex-direction: column;
          gap: 2px;
          box-shadow: var(--shadow-md);
        }

        /* Glassmorphic inputs and tabs */
        .login-card-glass input {
          background: rgba(255, 255, 255, 0.04) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          color: #fff !important;
        }

        .login-card-glass input:focus {
          border-color: var(--c-primary) !important;
          box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.2) !important;
        }

        .login-card-glass .tabs {
          background: rgba(255, 255, 255, 0.03) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
        }

        .login-card-glass .tab-btn {
          background: transparent !important;
          color: rgba(255, 255, 255, 0.45) !important;
        }

        .login-card-glass .tab-btn.active {
          background: rgba(255, 255, 255, 0.07) !important;
          color: var(--c-primary) !important;
        }

        .hud-overlay {
          position: absolute;
          inset: 0;
          z-index: 3;
          pointer-events: none;
          padding: var(--space-6);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .hud-top {
          display: flex;
          justify-content: space-between;
          font-family: var(--font-display);
        }

        .hud-bottom {
          display: flex;
          justify-content: space-between;
          font-family: var(--font-display);
        }

        .hud-indicator {
          background: rgba(20, 27, 45, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--r-md);
          padding: 8px 12px;
          backdrop-filter: blur(8px);
          display: flex;
          flex-direction: column;
          gap: 2px;
          box-shadow: var(--shadow-md);
        }

        .hud-label {
          font-size: 0.65rem;
          color: var(--c-text-3);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .hud-val {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--c-text);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .hud-dot-active {
          width: 6px;
          height: 6px;
          background: var(--c-green);
          border-radius: 50%;
          box-shadow: 0 0 8px var(--c-green);
          display: inline-block;
        }

        .hud-dot-orange {
          width: 6px;
          height: 6px;
          background: var(--c-primary);
          border-radius: 50%;
          box-shadow: 0 0 8px var(--c-primary);
          display: inline-block;
        }

        .scan-line {
          position: absolute;
          left: 0;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--c-primary-glow), transparent);
          opacity: 0.3;
          z-index: 4;
          animation: scan 6s linear infinite;
        }

        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      `}</style>

      {/* Left side: Login Form Column */}
      <div className="login-form-column">
        <div className="card login-card-glass" style={{ position: 'relative' }}>
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
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.4rem', color: '#fff', letterSpacing: '0.05em' }}>
              ATLETİKPLUS
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

      {/* Viewport Scanline */}
      <div className="scan-line"></div>

      {/* Screen edge HUD Overlay */}
      <div className="hud-overlay">
        <div className="hud-top">
          <div className="hud-indicator">
            <span className="hud-label">Sistem Durumu</span>
            <span className="hud-val">
              <span className="hud-dot-active"></span> AKTİF
            </span>
          </div>
          <div className="hud-indicator">
            <span className="hud-label">Performans Analizi</span>
            <span className="hud-val">
              <span className="hud-dot-orange"></span> DEPOLANIYOR
            </span>
          </div>
        </div>
        <div className="hud-bottom">
          <div className="hud-indicator">
            <span className="hud-label">Yapay Zeka Yardımı</span>
            <span className="hud-val">AKTİF</span>
          </div>
          <div className="hud-indicator">
            <span className="hud-label">Konum</span>
            <span className="hud-val">KORT 01 - ANA GİRİŞ</span>
          </div>
        </div>
      </div>
    </div>
  );
}
