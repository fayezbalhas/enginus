'use client'

import { type ColumnType, type DesignCode, type InteractionPoint, fmt, barArea } from './types'

// ── Column Section Drawing ───────────────────────────────────────────────────

interface SectionProps {
  colType: ColumnType; b: number; h: number; D: number
  cnom: number; linkDia: number; barDia: number
  barPositions: { x: number; y: number }[]
  code: DesignCode; nBars: number; NEd: number
}

export function ColumnSectionDrawing({ colType, b, h, D, cnom, linkDia, barDia, barPositions, code, nBars, NEd }: SectionProps) {
  const svgW = 340
  const svgH = 380
  const margin = 50

  const actualW = colType === 'rectangular' ? b : D
  const actualH = colType === 'rectangular' ? h : D
  const scaleX = (svgW - 2 * margin) / Math.max(actualW, 1)
  const scaleY = (svgH - 2 * margin - 40) / Math.max(actualH, 1)
  const scale = Math.min(scaleX, scaleY, 0.8)

  const drawW = actualW * scale
  const drawH = actualH * scale
  const oX = (svgW - drawW) / 2
  const oY = (svgH - drawH) / 2 - 10

  const coverPx = cnom * scale
  const linkPx = linkDia * scale
  const barR = Math.max(barDia * scale / 2, 3.5)

  const dPrime = cnom + linkDia + barDia / 2
  const d = (colType === 'rectangular' ? h : D) - dPrime
  const dPx = d * scale
  const dPrimePx = dPrime * scale

  const totalAs = nBars * barArea(barDia)

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', maxWidth: '340px', height: 'auto' }}>
      {colType === 'rectangular' ? (
        <>
          {/* Concrete outline */}
          <rect x={oX} y={oY} width={drawW} height={drawH} fill="#151515" stroke="#444" strokeWidth="2" />
          {/* Link outline */}
          <rect x={oX + coverPx} y={oY + coverPx} width={drawW - 2 * coverPx} height={drawH - 2 * coverPx} fill="none" stroke="#555" strokeWidth="1.5" rx="3" />

          {/* b dimension (bottom) */}
          <line x1={oX} y1={oY + drawH + 16} x2={oX + drawW} y2={oY + drawH + 16} stroke="#888" strokeWidth="0.8" />
          <line x1={oX} y1={oY + drawH + 12} x2={oX} y2={oY + drawH + 20} stroke="#888" strokeWidth="0.8" />
          <line x1={oX + drawW} y1={oY + drawH + 12} x2={oX + drawW} y2={oY + drawH + 20} stroke="#888" strokeWidth="0.8" />
          <text x={oX + drawW / 2} y={oY + drawH + 30} textAnchor="middle" fill="#888" fontSize="10" fontFamily="monospace">b={b}</text>

          {/* h dimension (right) */}
          <line x1={oX + drawW + 16} y1={oY} x2={oX + drawW + 16} y2={oY + drawH} stroke="#888" strokeWidth="0.8" />
          <line x1={oX + drawW + 12} y1={oY} x2={oX + drawW + 20} y2={oY} stroke="#888" strokeWidth="0.8" />
          <line x1={oX + drawW + 12} y1={oY + drawH} x2={oX + drawW + 20} y2={oY + drawH} stroke="#888" strokeWidth="0.8" />
          <text x={oX + drawW + 28} y={oY + drawH / 2 + 4} textAnchor="middle" fill="#888" fontSize="10" fontFamily="monospace" transform={`rotate(90, ${oX + drawW + 28}, ${oY + drawH / 2})`}>h={h}</text>
        </>
      ) : (
        <>
          {/* Concrete circle */}
          <circle cx={oX + drawW / 2} cy={oY + drawH / 2} r={drawW / 2} fill="#151515" stroke="#444" strokeWidth="2" />
          {/* Link circle */}
          <circle cx={oX + drawW / 2} cy={oY + drawH / 2} r={drawW / 2 - coverPx} fill="none" stroke="#555" strokeWidth="1.5" />

          {/* D dimension */}
          <line x1={oX} y1={oY + drawH + 16} x2={oX + drawW} y2={oY + drawH + 16} stroke="#888" strokeWidth="0.8" />
          <line x1={oX} y1={oY + drawH + 12} x2={oX} y2={oY + drawH + 20} stroke="#888" strokeWidth="0.8" />
          <line x1={oX + drawW} y1={oY + drawH + 12} x2={oX + drawW} y2={oY + drawH + 20} stroke="#888" strokeWidth="0.8" />
          <text x={oX + drawW / 2} y={oY + drawH + 30} textAnchor="middle" fill="#888" fontSize="10" fontFamily="monospace">D={D}</text>
        </>
      )}

      {/* d dimension line (left) */}
      <line x1={oX - 18} y1={oY} x2={oX - 18} y2={oY + dPx} stroke="#cc0000" strokeWidth="0.8" />
      <line x1={oX - 24} y1={oY} x2={oX - 12} y2={oY} stroke="#cc0000" strokeWidth="0.8" />
      <line x1={oX - 24} y1={oY + dPx} x2={oX - 12} y2={oY + dPx} stroke="#cc0000" strokeWidth="0.8" />
      <text x={oX - 26} y={oY + dPx / 2 + 4} textAnchor="end" fill="#cc0000" fontSize="9" fontFamily="monospace" fontWeight="bold">d={fmt(d, 0)}</text>

      {/* d' dimension */}
      <line x1={oX - 8} y1={oY} x2={oX - 8} y2={oY + dPrimePx} stroke="#888" strokeWidth="0.6" strokeDasharray="2,2" />
      <text x={oX - 10} y={oY + dPrimePx + 12} textAnchor="end" fill="#666" fontSize="8" fontFamily="monospace">d&apos;={fmt(dPrime, 0)}</text>

      {/* d dashed line */}
      <line x1={oX} y1={oY + dPx} x2={oX + drawW} y2={oY + dPx} stroke="#cc0000" strokeWidth="0.6" strokeDasharray="4,3" opacity="0.3" />

      {/* Cover label */}
      <text x={oX + 6} y={oY + drawH - 6} fill="#444" fontSize="8" fontFamily="monospace">c={cnom}</text>

      {/* Bars */}
      {barPositions.map((bar, i) => {
        const cx = oX + bar.x * scale
        const cy = oY + bar.y * scale
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={barR} fill="#cc0000" />
            <circle cx={cx} cy={cy} r={barR + 1} fill="none" stroke="#cc0000" strokeWidth="0.5" opacity="0.3" />
          </g>
        )
      })}

      {/* Bar label */}
      <text x={oX + drawW / 2} y={oY - 12} textAnchor="middle" fill="#cc0000" fontSize="10" fontFamily="monospace" fontWeight="bold">
        {nBars}{code === 'EC2' ? `T${barDia}` : `#${Math.round(barDia / 3.175)}`}
      </text>
      <text x={oX + drawW / 2} y={oY - 24} textAnchor="middle" fill="#555" fontSize="9" fontFamily="monospace">
        As={fmt(totalAs, 0)} mm²
      </text>

      {/* NEd arrow */}
      <line x1={oX + drawW / 2} y1={oY + drawH + 42} x2={oX + drawW / 2} y2={oY + drawH + 58} stroke="#cc0000" strokeWidth="1.5" markerEnd="url(#arrowDown)" />
      <defs>
        <marker id="arrowDown" markerWidth="6" markerHeight="6" refX="3" refY="6" orient="auto">
          <path d="M0,0 L3,6 L6,0" fill="none" stroke="#cc0000" strokeWidth="1" />
        </marker>
      </defs>
      <text x={oX + drawW / 2 + 10} y={oY + drawH + 55} fill="#cc0000" fontSize="9" fontFamily="monospace">NEd={NEd}kN</text>
    </svg>
  )
}

// ── Interaction Diagram ──────────────────────────────────────────────────────

interface DiagramProps {
  curve: InteractionPoint[]
  NEd: number; MEd: number
  pass: boolean
  momentUnit: string; forceUnit: string
}

export function InteractionDiagram({ curve, NEd, MEd, pass, momentUnit, forceUnit }: DiagramProps) {
  if (curve.length < 3) return null

  const W = 380
  const H = 320
  const pad = 55

  const maxN = Math.max(...curve.map(p => p.N)) * 1.1
  const minN = Math.min(...curve.map(p => p.N), 0) * 1.1
  const maxM = Math.max(...curve.map(p => p.M), Math.abs(MEd)) * 1.25
  if (maxM <= 0 || maxN - minN <= 0) return null

  const toX = (m: number) => pad + (m / maxM) * (W - 2 * pad)
  const toY = (n: number) => pad + ((maxN - n) / (maxN - minN)) * (H - 2 * pad)

  const pathD = curve.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.M).toFixed(1)},${toY(p.N).toFixed(1)}`).join(' ') + 'Z'

  const zeroY = toY(0)
  const balIdx = curve.reduce((best, p, i) => p.M > curve[best].M ? i : best, 0)
  const bal = curve[balIdx]

  const gridNs = []
  const nStep = Math.pow(10, Math.floor(Math.log10(Math.max(maxN, -minN) / 3)))
  for (let n = 0; n <= maxN; n += nStep) gridNs.push(n)
  for (let n = -nStep; n >= minN; n -= nStep) gridNs.push(n)

  const gridMs = []
  const mStep = Math.pow(10, Math.floor(Math.log10(maxM / 3)))
  for (let m = 0; m <= maxM; m += mStep) gridMs.push(m)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {/* Grid */}
      {gridNs.map((n, i) => (
        <g key={`gn${i}`}>
          <line x1={pad} y1={toY(n)} x2={W - pad} y2={toY(n)} stroke="#1a1a1a" strokeWidth="0.5" />
          <text x={pad - 4} y={toY(n) + 3} textAnchor="end" fill="#444" fontSize="8" fontFamily="monospace">{n >= 1000 || n <= -1000 ? `${(n / 1000).toFixed(0)}k` : n.toFixed(0)}</text>
        </g>
      ))}
      {gridMs.map((m, i) => (
        <g key={`gm${i}`}>
          <line x1={toX(m)} y1={pad} x2={toX(m)} y2={H - pad} stroke="#1a1a1a" strokeWidth="0.5" />
          <text x={toX(m)} y={H - pad + 14} textAnchor="middle" fill="#444" fontSize="8" fontFamily="monospace">{m.toFixed(0)}</text>
        </g>
      ))}

      {/* Axes */}
      <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="#333" strokeWidth="1" />
      <line x1={pad} y1={zeroY} x2={W - pad} y2={zeroY} stroke="#333" strokeWidth="1" />

      {/* Safe zone fill */}
      <path d={pathD} fill="rgba(34,197,94,0.06)" stroke="none" />

      {/* Interaction curve */}
      <path d={pathD} fill="none" stroke="#cc0000" strokeWidth="2" />

      {/* Balance point */}
      <circle cx={toX(bal.M)} cy={toY(bal.N)} r="3" fill="#f59e0b" />
      <text x={toX(bal.M) + 6} y={toY(bal.N) - 4} fill="#f59e0b" fontSize="8" fontFamily="monospace">Bal</text>

      {/* Pure bending point */}
      {curve.filter(p => p.N <= 0.01 * maxN && p.N >= -0.01 * maxN && p.M > 0).slice(0, 1).map((p, i) => (
        <g key={`pb${i}`}>
          <circle cx={toX(p.M)} cy={toY(p.N)} r="3" fill="#3b82f6" />
          <text x={toX(p.M) + 6} y={toY(p.N) + 12} fill="#3b82f6" fontSize="8" fontFamily="monospace">Mu</text>
        </g>
      ))}

      {/* Design point */}
      <circle cx={toX(Math.abs(MEd))} cy={toY(NEd)} r="5" fill={pass ? '#22c55e' : '#ef4444'} stroke="#fff" strokeWidth="1" />
      <text x={toX(Math.abs(MEd)) + 8} y={toY(NEd) + 4} fill={pass ? '#22c55e' : '#ef4444'} fontSize="9" fontFamily="monospace" fontWeight="bold">
        ({fmt(NEd, 0)}, {fmt(Math.abs(MEd), 0)})
      </text>

      {/* Axis labels */}
      <text x={W / 2} y={H - 8} textAnchor="middle" fill="#666" fontSize="10" fontFamily="monospace">M ({momentUnit})</text>
      <text x={14} y={H / 2} textAnchor="middle" fill="#666" fontSize="10" fontFamily="monospace" transform={`rotate(-90, 14, ${H / 2})`}>N ({forceUnit})</text>
    </svg>
  )
}
