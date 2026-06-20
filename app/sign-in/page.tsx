'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '../components/Navbar'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <main style={{ background: '#0a0a0a', color: '#f0f0f0', fontFamily: "'Inter', sans-serif", minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .auth-input {
          background: #111; border: 1px solid #2a2a2a; color: #f0f0f0; padding: 14px 18px;
          font-size: 15px; border-radius: 4px; outline: none; transition: border-color 0.2s;
          width: 100%; font-family: 'Inter', sans-serif;
        }
        .auth-input::placeholder { color: #444; }
        .auth-input:focus { border-color: #cc0000; }

        .auth-btn {
          background: #cc0000; color: #fff; border: none; padding: 15px 34px;
          font-size: 15px; font-weight: 600; border-radius: 4px; cursor: pointer;
          transition: all 0.25s; letter-spacing: 0.02em; width: 100%;
          font-family: 'Inter', sans-serif; position: relative; overflow: hidden; z-index: 1;
        }
        .auth-btn::before {
          content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
          background: linear-gradient(90deg, #e60000, #ff2222); transition: left 0.35s ease; z-index: -1;
        }
        .auth-btn:hover::before { left: 0; }
        .auth-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(204,0,0,0.4); }
        .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .auth-btn:disabled:hover::before { left: -100%; }
        .auth-btn:disabled:hover { box-shadow: none; }

        .auth-link { color: #cc0000; text-decoration: none; font-weight: 500; transition: color 0.2s; }
        .auth-link:hover { color: #ff4444; }

        @media (max-width: 480px) {
          .auth-card { margin: 0 16px !important; padding: 32px 24px !important; }
        }
      `}</style>

      <Navbar />

      <section style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div className="auth-card" style={{ width: '100%', maxWidth: '420px', background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '44px 36px' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '10px' }}>
              Welcome back
            </h1>
            <p style={{ fontSize: '14px', color: '#666' }}>Sign in to your Enginus account</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#888', marginBottom: '6px' }}>Email</label>
              <input
                type="email"
                className="auth-input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#888', marginBottom: '6px' }}>Password</label>
              <input
                type="password"
                className="auth-input"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div style={{ background: 'rgba(204,0,0,0.1)', border: '1px solid rgba(204,0,0,0.3)', borderRadius: '4px', padding: '12px 16px', fontSize: '13px', color: '#ff4444' }}>
                {error}
              </div>
            )}

            <button type="submit" className="auth-btn" disabled={loading} style={{ marginTop: '8px' }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '28px', fontSize: '14px', color: '#666' }}>
            Don&apos;t have an account?{' '}
            <a href="/sign-up" className="auth-link">Sign up</a>
          </p>
        </div>
      </section>
    </main>
  )
}
