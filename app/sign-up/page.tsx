'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '../components/Navbar'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
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
              Create your account
            </h1>
            <p style={{ fontSize: '14px', color: '#666' }}>Start using Enginus Pro tools</p>
          </div>

          {success ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(204,0,0,0.1)', border: '1px solid rgba(204,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '24px', color: '#cc0000' }}>
                ✓
              </div>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>Check your email</h2>
              <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.7, marginBottom: '28px' }}>
                We&apos;ve sent a confirmation link to <strong style={{ color: '#f0f0f0' }}>{email}</strong>. Click the link to activate your account.
              </p>
              <a href="/sign-in" className="auth-link" style={{ fontSize: '14px' }}>Back to sign in</a>
            </div>
          ) : (
            <>
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
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="auth-input"
                      style={{ paddingRight: '48px' }}
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {showPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cc0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cc0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#888', marginBottom: '6px' }}>Confirm password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="auth-input"
                      style={{ paddingRight: '48px' }}
                      placeholder="Repeat your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {showConfirmPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cc0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cc0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div style={{ background: 'rgba(204,0,0,0.1)', border: '1px solid rgba(204,0,0,0.3)', borderRadius: '4px', padding: '12px 16px', fontSize: '13px', color: '#ff4444' }}>
                    {error}
                  </div>
                )}

                <button type="submit" className="auth-btn" disabled={loading} style={{ marginTop: '8px' }}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: '28px', fontSize: '14px', color: '#666' }}>
                Already have an account?{' '}
                <a href="/sign-in" className="auth-link">Sign in</a>
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
