'use client'

import { type SeismicResult, type DesignCode, fmt } from './types'

// ── Response Spectrum Plot ──────────────────────────────────────────────────

interface SpectrumProps {
  result: SeismicResult
  code: DesignCode
}

export function SpectrumPlot({ result, code }: SpectrumProps) {
  const svgW = 500
  const svgH = 300
  const margin = { top: 30, right: 30, bottom: 45, left: 55 }
  const plotW = svgW - margin.left - margin.right
  const plotH = svgH - margin.top - margin.bottom

  const maxT = 4.0
  const points = result.spectrumPoints

  // Find max Se for y-axis scaling
  const maxSe = Math.max(...points.map(p => p.Se), result.Se_T1) * 1.15

  const scaleX = (t: number) => margin.left + (t / maxT) * plotW
  const scaleY = (v: number) => margin.top + plotH - (v / maxSe) * plotH

  // Se curve path
  const sePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${scaleX(p.T).toFixed(1)},${scaleY(p.Se).toFixed(1)}`).join(' ')

  // Sd curve path (only for EC8)
  const sdPath = code === 'EC8'
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'}${scaleX(p.T).toFixed(1)},${scaleY(p.Sd).toFixed(1)}`).join(' ')
    : ''

  // Grid lines
  const xTicks = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0]
  const yTickCount = 5
  const yStep = maxSe / yTickCount

  const T1x = scaleX(result.T1)
  const T1y = scaleY(code === 'EC8' ? result.Sd_T1 : result.Se_T1)

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', maxWidth: '500px', height: 'auto' }}>
      {/* Background */}
      <rect x={margin.left} y={margin.top} width={plotW} height={plotH} fill="#0d0d0d" stroke="#1e1e1e" strokeWidth="1" />

      {/* Grid lines */}
      {xTicks.map(t => (
        <g key={`gx${t}`}>
          <line x1={scaleX(t)} y1={margin.top} x2={scaleX(t)} y2={margin.top + plotH} stroke="#1a1a1a" strokeWidth="0.5" />
          <text x={scaleX(t)} y={margin.top + plotH + 14} textAnchor="middle" fill="#555" fontSize="9" fontFamily="monospace">{t}</text>
        </g>
      ))}
      {Array.from({ length: yTickCount + 1 }, (_, i) => i * yStep).map(v => (
        <g key={`gy${v}`}>
          <line x1={margin.left} y1={scaleY(v)} x2={margin.left + plotW} y2={scaleY(v)} stroke="#1a1a1a" strokeWidth="0.5" />
          <text x={margin.left - 6} y={scaleY(v) + 3} textAnchor="end" fill="#555" fontSize="9" fontFamily="monospace">{fmt(v, 2)}</text>
        </g>
      ))}

      {/* Se curve */}
      <path d={sePath} fill="none" stroke="#cc0000" strokeWidth="2" />

      {/* Sd curve (EC8 only) */}
      {code === 'EC8' && sdPath && (
        <path d={sdPath} fill="none" stroke="#cc0000" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.6" />
      )}

      {/* T1 marker vertical line */}
      <line x1={T1x} y1={margin.top} x2={T1x} y2={margin.top + plotH} stroke="#f59e0b" strokeWidth="1" strokeDasharray="4,3" />

      {/* T1 marker dot */}
      <circle cx={T1x} cy={T1y} r="4" fill="#f59e0b" stroke="#111" strokeWidth="1.5" />

      {/* T1 label */}
      <text x={T1x + 6} y={T1y - 8} fill="#f59e0b" fontSize="10" fontFamily="monospace" fontWeight="bold">
        T1={fmt(result.T1, 2)}s
      </text>

      {/* Axis labels */}
      <text x={margin.left + plotW / 2} y={svgH - 4} textAnchor="middle" fill="#666" fontSize="10" fontFamily="monospace">Period T (s)</text>
      <text
        x={14} y={margin.top + plotH / 2}
        textAnchor="middle" fill="#666" fontSize="10" fontFamily="monospace"
        transform={`rotate(-90, 14, ${margin.top + plotH / 2})`}
      >
        {code === 'EC8' ? 'Se, Sd (g)' : 'Sa (g)'}
      </text>

      {/* Title */}
      <text x={margin.left + plotW / 2} y={16} textAnchor="middle" fill="#888" fontSize="11" fontFamily="'Inter', sans-serif" fontWeight="600">
        {code === 'EC8' ? 'EC8 Response Spectrum' : 'ASCE 7 Design Spectrum'}
      </text>

      {/* Legend */}
      <line x1={margin.left + plotW - 120} y1={margin.top + 12} x2={margin.left + plotW - 100} y2={margin.top + 12} stroke="#cc0000" strokeWidth="2" />
      <text x={margin.left + plotW - 96} y={margin.top + 15} fill="#888" fontSize="8" fontFamily="monospace">
        {code === 'EC8' ? 'Se(T)' : 'Sa(T)'}
      </text>
      {code === 'EC8' && (
        <>
          <line x1={margin.left + plotW - 120} y1={margin.top + 24} x2={margin.left + plotW - 100} y2={margin.top + 24} stroke="#cc0000" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.6" />
          <text x={margin.left + plotW - 96} y={margin.top + 27} fill="#888" fontSize="8" fontFamily="monospace">Sd(T)</text>
        </>
      )}
    </svg>
  )
}

// ── Building Elevation with Force Distribution ──────────────────────────────

interface BuildingProps {
  result: SeismicResult
  nFloors: number
  H: number
  units: 'SI' | 'Imperial'
}

export function BuildingElevation({ result, nFloors, H, units }: BuildingProps) {
  const svgW = 400
  const svgH = Math.max(280, nFloors * 35 + 100)
  const margin = { top: 30, right: 120, bottom: 40, left: 50 }
  const buildW = 80
  const buildH = svgH - margin.top - margin.bottom

  const forceUnit = units === 'SI' ? 'kN' : 'kip'
  const heightUnit = units === 'SI' ? 'm' : 'ft'

  const buildX = margin.left
  const buildBottom = margin.top + buildH
  const floorH = buildH / nFloors

  const maxForce = Math.max(...result.floors.map(f => f.Fi), 1)
  const maxArrowLen = svgW - margin.left - buildW - margin.right - 20

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', maxWidth: '400px', height: 'auto' }}>
      {/* Title */}
      <text x={svgW / 2} y={16} textAnchor="middle" fill="#888" fontSize="11" fontFamily="'Inter', sans-serif" fontWeight="600">
        Lateral Force Distribution
      </text>

      {/* Ground line */}
      <line x1={buildX - 20} y1={buildBottom} x2={buildX + buildW + 20} y2={buildBottom} stroke="#555" strokeWidth="2" />
      {/* Ground hatch */}
      {Array.from({ length: 8 }, (_, i) => (
        <line key={i}
          x1={buildX - 20 + i * 14}
          y1={buildBottom}
          x2={buildX - 28 + i * 14}
          y2={buildBottom + 8}
          stroke="#444" strokeWidth="1"
        />
      ))}

      {/* Building floors */}
      {Array.from({ length: nFloors }, (_, i) => {
        const floorTop = buildBottom - (i + 1) * floorH
        const floorBottom = buildBottom - i * floorH
        return (
          <g key={i}>
            {/* Floor rectangle */}
            <rect
              x={buildX}
              y={floorTop}
              width={buildW}
              height={floorH}
              fill="rgba(17,17,17,0.8)"
              stroke="#333"
              strokeWidth="1"
            />
            {/* Floor label */}
            <text x={buildX + buildW / 2} y={(floorTop + floorBottom) / 2 + 3} textAnchor="middle" fill="#555" fontSize="8" fontFamily="monospace">
              F{i + 1}
            </text>
          </g>
        )
      })}

      {/* Force arrows */}
      {result.floors.map((f, i) => {
        const floorY = buildBottom - f.zi / H * buildH
        const arrowLen = maxForce > 0 ? (f.Fi / maxForce) * maxArrowLen : 0
        if (arrowLen < 2) return null
        const arrowX1 = buildX + buildW
        const arrowX2 = arrowX1 + arrowLen

        return (
          <g key={`arrow${i}`}>
            {/* Arrow line */}
            <line x1={arrowX1} y1={floorY} x2={arrowX2} y2={floorY} stroke="#cc0000" strokeWidth="2" />
            {/* Arrow head */}
            <polygon
              points={`${arrowX1},${floorY} ${arrowX1 + 8},${floorY - 4} ${arrowX1 + 8},${floorY + 4}`}
              fill="#cc0000"
            />
            {/* Force label */}
            <text x={arrowX2 + 6} y={floorY + 3} fill="#f0f0f0" fontSize="9" fontFamily="monospace" fontWeight="600">
              {fmt(f.Fi, 1)} {forceUnit}
            </text>
          </g>
        )
      })}

      {/* Height labels (left side) */}
      {result.floors.map((f, i) => {
        const floorY = buildBottom - f.zi / H * buildH
        return (
          <text key={`h${i}`} x={buildX - 6} y={floorY + 3} textAnchor="end" fill="#666" fontSize="8" fontFamily="monospace">
            {fmt(f.zi, 1)}{heightUnit}
          </text>
        )
      })}

      {/* Base shear label at bottom */}
      <text x={buildX + buildW / 2} y={buildBottom + 24} textAnchor="middle" fill="#cc0000" fontSize="10" fontFamily="monospace" fontWeight="bold">
        V = {fmt(result.baseShear, 1)} {forceUnit}
      </text>
    </svg>
  )
}
