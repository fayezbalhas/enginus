'use client'

import { type StepItem, type FlexureResult, type ShearResult, type CrackResult, type DeflectionResult, type BarScheduleItem, fmt } from './types'

// ── Step-by-step panel ────────────────────────────────────────────────────────

export function StepSection({ title, steps }: { title: string; steps: StepItem[] }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: '#cc0000', textTransform: 'uppercase', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid #1a1a1a' }}>
        {title}
      </div>
      {steps.map((s, i) => (
        <div key={i} style={{ padding: '8px 10px', borderLeft: '2px solid #1e1e1e', marginBottom: '6px', background: '#0c0c0c', borderRadius: '0 4px 4px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            {s.clause && (
              <span style={{
                fontSize: '9px', fontWeight: 700, color: '#cc0000', background: 'rgba(204,0,0,0.08)',
                padding: '1px 6px', borderRadius: '3px', whiteSpace: 'nowrap',
              }}>
                {s.clause}
              </span>
            )}
            <span style={{ fontSize: '11px', color: '#777' }}>{s.description}</span>
          </div>
          <div style={{ fontSize: '11px', color: '#555', fontFamily: "'Space Grotesk', monospace", marginTop: '2px' }}>{s.formula}</div>
          {s.substitution && <div style={{ fontSize: '11px', color: '#888', fontFamily: "'Space Grotesk', monospace", marginTop: '1px' }}>{s.substitution}</div>}
          <div style={{ fontSize: '12px', color: '#f0f0f0', fontWeight: 600, fontFamily: "'Space Grotesk', monospace", marginTop: '2px' }}>{s.result}</div>
        </div>
      ))}
    </div>
  )
}

// ── Result summary card ───────────────────────────────────────────────────────

interface ResultCardProps {
  title: string
  mainLabel: string
  mainValue: string
  secondLabel?: string
  secondValue?: string
  utilization: number
  pass: boolean
  unit?: string
}

export function ResultCard({ title, mainLabel, mainValue, secondLabel, secondValue, utilization, pass, unit }: ResultCardProps) {
  const util = Math.min(utilization, 150)
  const barWidth = Math.min(util, 100)

  return (
    <div style={{
      background: '#111', border: `1px solid ${pass ? '#1e1e1e' : 'rgba(239,68,68,0.3)'}`,
      borderRadius: '8px', padding: '16px', transition: 'border-color 0.3s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#666', textTransform: 'uppercase' }}>{title}</span>
        <span style={{
          fontSize: '10px', fontWeight: 700, padding: '2px 10px', borderRadius: '4px',
          background: pass ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
          color: pass ? '#22c55e' : '#ef4444',
          letterSpacing: '0.05em',
        }}>
          {pass ? 'PASS' : 'FAIL'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#555', marginBottom: '2px' }}>{mainLabel}</div>
          <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: "'Space Grotesk', monospace", color: '#f0f0f0' }}>
            {mainValue}
            {unit && <span style={{ fontSize: '11px', color: '#555', marginLeft: '4px' }}>{unit}</span>}
          </div>
        </div>
        {secondLabel && (
          <div>
            <div style={{ fontSize: '10px', color: '#555', marginBottom: '2px' }}>{secondLabel}</div>
            <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: "'Space Grotesk', monospace", color: pass ? '#22c55e' : '#ef4444' }}>
              {secondValue}
              {unit && <span style={{ fontSize: '11px', color: '#555', marginLeft: '4px' }}>{unit}</span>}
            </div>
          </div>
        )}
      </div>

      {/* Utilization bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span style={{ fontSize: '10px', color: '#555' }}>Utilization</span>
          <span style={{ fontSize: '10px', fontWeight: 700, color: util > 100 ? '#ef4444' : '#888', fontFamily: "'Space Grotesk', monospace" }}>
            {fmt(util, 1)}%
          </span>
        </div>
        <div style={{ background: '#1a1a1a', borderRadius: '3px', height: '5px', overflow: 'hidden' }}>
          <div style={{
            width: `${barWidth}%`, height: '100%', borderRadius: '3px',
            background: util > 100 ? '#ef4444' : util > 85 ? '#f59e0b' : '#22c55e',
            transition: 'width 0.4s ease, background 0.4s ease',
          }} />
        </div>
      </div>
    </div>
  )
}

// ── Summary table ─────────────────────────────────────────────────────────────

interface SummaryRow {
  check: string
  required: string
  provided: string
  utilization: number
  pass: boolean
}

export function SummaryTable({ rows }: { rows: SummaryRow[] }) {
  return (
    <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '16px', marginTop: '12px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#666', textTransform: 'uppercase', marginBottom: '10px' }}>Summary</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: '#555', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Check</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', color: '#555', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Required</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', color: '#555', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Provided</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', color: '#555', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Util.</th>
              <th style={{ textAlign: 'center', padding: '6px 8px', color: '#555', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #111' }}>
                <td style={{ padding: '7px 8px', color: '#aaa', fontFamily: "'Space Grotesk', monospace" }}>{r.check}</td>
                <td style={{ padding: '7px 8px', color: '#666', textAlign: 'right', fontFamily: "'Space Grotesk', monospace" }}>{r.required}</td>
                <td style={{ padding: '7px 8px', color: '#f0f0f0', textAlign: 'right', fontWeight: 600, fontFamily: "'Space Grotesk', monospace" }}>{r.provided}</td>
                <td style={{ padding: '7px 8px', color: r.utilization > 100 ? '#ef4444' : '#888', textAlign: 'right', fontFamily: "'Space Grotesk', monospace" }}>{fmt(r.utilization, 1)}%</td>
                <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                  <span style={{
                    fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '3px',
                    background: r.pass ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                    color: r.pass ? '#22c55e' : '#ef4444',
                  }}>
                    {r.pass ? 'PASS' : 'FAIL'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Bar Schedule ──────────────────────────────────────────────────────────────

export function BarSchedulePanel({ items, As_req }: { items: BarScheduleItem[]; As_req: number }) {
  if (items.length === 0) return null
  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#666', textTransform: 'uppercase', marginBottom: '8px' }}>
        Suggested Arrangements (As,req = {fmt(As_req, 0)} mm²)
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {items.map((bs, i) => (
          <div key={i} style={{
            background: '#0d0d0d', border: `1px solid ${bs.sufficient ? '#1e1e1e' : 'rgba(239,68,68,0.2)'}`,
            borderRadius: '6px', padding: '8px 14px', textAlign: 'center', minWidth: '90px',
          }}>
            <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: "'Space Grotesk', monospace", color: bs.sufficient ? '#f0f0f0' : '#666' }}>
              {bs.label}
            </div>
            <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>
              {fmt(bs.As_prov, 0)} mm²
              <span style={{ marginLeft: '4px', color: bs.sufficient ? '#22c55e' : '#ef4444' }}>
                {bs.sufficient ? '✓' : '✗'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
