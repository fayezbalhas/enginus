'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function ProGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <>{children}</>

  if (isLoggedIn) return <>{children}</>

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ filter: 'blur(5px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.4 }}>
        {children}
      </div>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(10, 10, 10, 0.75)',
      }}>
        <div style={{
          textAlign: 'center', maxWidth: '400px', padding: '48px 32px',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.9 }}>&#128274;</div>
          <div style={{
            display: 'inline-block', background: 'rgba(204,0,0,0.15)', border: '1px solid rgba(204,0,0,0.3)',
            borderRadius: '4px', padding: '6px 16px', fontSize: '11px', fontWeight: 700,
            letterSpacing: '0.12em', color: '#ff4444', textTransform: 'uppercase', marginBottom: '20px',
          }}>
            Sign In Required
          </div>
          <p style={{
            fontSize: '16px', color: '#999', lineHeight: 1.7, marginBottom: '32px',
            fontFamily: "'Inter', sans-serif",
          }}>
            Sign in to your account to access this calculator.
          </p>
          <a
            href="/auth"
            style={{
              background: '#cc0000', color: '#fff', border: 'none', padding: '14px 32px',
              fontSize: '15px', fontWeight: 600, borderRadius: '4px', cursor: 'pointer',
              textDecoration: 'none', display: 'inline-block', transition: 'all 0.25s',
              letterSpacing: '0.02em',
            }}
          >
            Sign In
          </a>
        </div>
      </div>
    </div>
  )
}
