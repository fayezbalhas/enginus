'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import type { User } from '@supabase/supabase-js'

type ActivePage = 'calculators' | 'pro' | 'about' | null

export default function Navbar({
  fixed = false,
  activePage = null,
}: {
  fixed?: boolean
  activePage?: ActivePage
}) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!fixed) return
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [fixed])

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const bg = fixed
    ? (scrolled ? 'rgba(10,10,10,0.85)' : 'transparent')
    : 'rgba(10,10,10,0.92)'
  const blur = fixed ? (scrolled ? 'blur(16px)' : 'none') : 'blur(16px)'
  const border = fixed
    ? (scrolled ? '1px solid #1e1e1e' : '1px solid transparent')
    : '1px solid #1a1a1a'

  return (
    <>
      <style>{`
        .n-nav { box-sizing: border-box; padding: 0 48px; }
        .n-links { display: flex; gap: 36px; align-items: center; }
        .n-link {
          color: #888; text-decoration: none; font-size: 14px;
          font-weight: 500; letter-spacing: 0.03em; transition: color 0.2s; position: relative;
        }
        .n-link::after {
          content: ''; position: absolute; bottom: -4px; left: 0; width: 0; height: 1px;
          background: #cc0000; transition: width 0.25s;
        }
        .n-link:hover { color: #f0f0f0; }
        .n-link:hover::after { width: 100%; }
        .n-link.cur { color: #f0f0f0; }
        .n-btn {
          background: #cc0000; color: #fff; text-decoration: none; padding: 10px 22px;
          font-size: 13px; font-weight: 600; border-radius: 4px; transition: all 0.2s;
          white-space: nowrap; display: inline-block;
        }
        .n-btn:hover { background: #e60000; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(204,0,0,0.35); }

        .n-sign-in {
          color: #888; text-decoration: none; font-size: 13px; font-weight: 500;
          padding: 10px 22px; border: 1px solid #333; border-radius: 4px;
          transition: all 0.2s; white-space: nowrap; display: inline-block;
        }
        .n-sign-in:hover { border-color: #cc0000; color: #f0f0f0; }

        .n-user-email {
          font-size: 12px; color: #666; max-width: 140px; overflow: hidden;
          text-overflow: ellipsis; white-space: nowrap;
        }
        .n-sign-out {
          background: none; border: 1px solid #333; color: #888; padding: 8px 16px;
          font-size: 12px; font-weight: 500; border-radius: 4px; cursor: pointer;
          transition: all 0.2s; font-family: 'Inter', sans-serif; white-space: nowrap;
        }
        .n-sign-out:hover { border-color: #cc0000; color: #f0f0f0; }

        .n-burger {
          display: none; flex-direction: column; justify-content: center; align-items: center;
          width: 44px; height: 44px; background: none; border: none; cursor: pointer;
          padding: 10px; border-radius: 6px; gap: 5px; flex-shrink: 0;
        }
        .n-burger:hover { background: rgba(255,255,255,0.06); }
        .n-bar { display: block; width: 22px; height: 2px; background: #f0f0f0; border-radius: 2px; transition: transform 0.25s, opacity 0.25s; }
        .n-burger.open .n-bar:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .n-burger.open .n-bar:nth-child(2) { opacity: 0; }
        .n-burger.open .n-bar:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

        .n-mobile {
          display: flex; position: fixed; top: 64px; left: 0; right: 0; z-index: 99;
          background: rgba(10,10,10,0.97); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid #1e1e1e; flex-direction: column; padding: 0 24px 20px;
          visibility: hidden; opacity: 0; transform: translateY(-6px);
          transition: opacity 0.22s ease, transform 0.22s ease, visibility 0s linear 0.22s;
        }
        .n-mobile.open {
          visibility: visible; opacity: 1; transform: translateY(0);
          transition: opacity 0.22s ease, transform 0.22s ease, visibility 0s linear 0s;
        }
        .n-mlink {
          display: flex; align-items: center; color: #aaa; text-decoration: none;
          font-size: 16px; font-weight: 500; min-height: 52px; border-bottom: 1px solid #1a1a1a;
          transition: color 0.2s; padding: 0 4px; letter-spacing: 0.01em;
        }
        .n-mlink:hover, .n-mlink.cur { color: #f0f0f0; }
        .n-mcta {
          display: flex; align-items: center; justify-content: center; min-height: 52px;
          background: #cc0000; color: #fff; text-decoration: none; font-size: 15px;
          font-weight: 600; border-radius: 4px; margin-top: 16px; transition: background 0.2s;
        }
        .n-mcta:hover { background: #e60000; }
        .n-msign-out {
          display: flex; align-items: center; justify-content: center; min-height: 52px;
          background: none; color: #aaa; border: 1px solid #333; font-size: 15px;
          font-weight: 500; border-radius: 4px; margin-top: 8px; cursor: pointer;
          transition: all 0.2s; font-family: 'Inter', sans-serif; width: 100%;
        }
        .n-msign-out:hover { border-color: #cc0000; color: #f0f0f0; }

        @media (max-width: 767px) {
          .n-nav { padding: 0 20px; }
          .n-links { display: none; }
          .n-burger { display: flex; }
        }
      `}</style>

      <nav
        className="n-nav"
        style={{
          position: fixed ? 'fixed' : 'sticky',
          top: 0, left: 0, right: 0, zIndex: 100,
          background: bg,
          backdropFilter: blur,
          WebkitBackdropFilter: blur,
          borderBottom: border,
          transition: fixed ? 'all 0.4s' : undefined,
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <a
          href="/"
          style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', textDecoration: 'none', color: '#f0f0f0' }}
        >
          ENGI<span style={{ color: '#cc0000' }}>NUS</span>
        </a>

        <div className="n-links">
          <a href="/calculators" className={`n-link${activePage === 'calculators' ? ' cur' : ''}`}>Calculators</a>
          <a href="/pro" className={`n-link${activePage === 'pro' ? ' cur' : ''}`}>Pro Tools</a>
          <a href="/about" className={`n-link${activePage === 'about' ? ' cur' : ''}`}>About</a>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span className="n-user-email">{user.email}</span>
              <button onClick={handleSignOut} className="n-sign-out">Sign Out</button>
            </div>
          ) : (
            <>
              <a href="/sign-in" className="n-sign-in">Sign In</a>
              <a href="/pro" className="n-btn">Go Pro</a>
            </>
          )}
        </div>

        <button
          className={`n-burger${open ? ' open' : ''}`}
          onClick={() => setOpen(v => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          <span className="n-bar" />
          <span className="n-bar" />
          <span className="n-bar" />
        </button>
      </nav>

      <div className={`n-mobile${open ? ' open' : ''}`}>
        <a href="/calculators" className={`n-mlink${activePage === 'calculators' ? ' cur' : ''}`} onClick={() => setOpen(false)}>Calculators</a>
        <a href="/pro" className={`n-mlink${activePage === 'pro' ? ' cur' : ''}`} onClick={() => setOpen(false)}>Pro Tools</a>
        <a href="/about" className={`n-mlink${activePage === 'about' ? ' cur' : ''}`} onClick={() => setOpen(false)}>About</a>
        {user ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', minHeight: '52px', borderBottom: '1px solid #1a1a1a', padding: '0 4px', fontSize: '14px', color: '#666' }}>
              {user.email}
            </div>
            <button onClick={() => { handleSignOut(); setOpen(false) }} className="n-msign-out">Sign Out</button>
          </>
        ) : (
          <>
            <a href="/sign-in" className="n-mlink" onClick={() => setOpen(false)}>Sign In</a>
            <a href="/pro" className="n-mcta" onClick={() => setOpen(false)}>Go Pro</a>
          </>
        )}
      </div>
    </>
  )
}
