'use client'

import { type ZonePressureResult, fmt } from './types'

interface DrawingProps {
  h: number
  b: number
  d: number
  zones: ZonePressureResult[]
  code: 'EC1' | 'ASCE7'
}

export function BuildingPressureDiagram({ h, b, d, zones, code }: DrawingProps) {
  const svgW = 480
  const svgH = 360
  const margin = { top: 30, right: 80, bottom: 40, left: 80 }
  const drawW = svgW - margin.left - margin.right
  const drawH = svgH - margin.top - margin.bottom

  if (h <= 0 || b <= 0 || zones.length === 0) {
    return (
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
        <text x={svgW / 2} y={svgH / 2} textAnchor="middle" fill="#555" fontSize="12" fontFamily="Inter, sans-serif">
          Enter building dimensions
        </text>
      </svg>
    )
  }

  // Scale building to fit
  const scaleY = drawH / h
  const buildingW = Math.min(drawW * 0.35, d * scaleY * 0.6)
  const buildingX = margin.left + (drawW - buildingW) / 2
  const buildingTop = margin.top
  const buildingBot = margin.top + drawH

  // Max pressure for arrow scaling
  const maxPressure = Math.max(
    ...zones.map(z => Math.abs(z.wNetWindward)),
    ...zones.map(z => Math.abs(z.wNetLeeward)),
    1
  )
  const maxArrowLen = 50

  return (
    <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ maxWidth: '480px' }}>
      {/* Background */}
      <rect width={svgW} height={svgH} fill="none" />

      {/* Ground line */}
      <line x1={margin.left - 20} y1={buildingBot} x2={svgW - margin.right + 20} y2={buildingBot} stroke="#333" strokeWidth="2" />
      <line x1={margin.left - 20} y1={buildingBot} x2={margin.left - 20} y2={buildingBot + 6} stroke="#333" strokeWidth="1.5" />
      <line x1={svgW - margin.right + 20} y1={buildingBot} x2={svgW - margin.right + 20} y2={buildingBot + 6} stroke="#333" strokeWidth="1.5" />

      {/* Building rectangle */}
      <rect x={buildingX} y={buildingTop} width={buildingW} height={drawH}
        fill="rgba(40,40,40,0.5)" stroke="#555" strokeWidth="1.5" />

      {/* Height zones */}
      {zones.map((zone, i) => {
        const zoneH = drawH / zones.length
        const yTop = buildingBot - (i + 1) * zoneH
        const yMid = yTop + zoneH / 2

        // Windward arrows (red, pointing right into building)
        const wLen = (Math.abs(zone.wNetWindward) / maxPressure) * maxArrowLen
        const wX1 = buildingX - wLen - 4
        const wX2 = buildingX - 4

        // Leeward arrows (blue, pointing right away from building)
        const lLen = (Math.abs(zone.wNetLeeward) / maxPressure) * maxArrowLen
        const lX1 = buildingX + buildingW + 4
        const lX2 = lX1 + lLen

        return (
          <g key={i}>
            {/* Zone boundary */}
            {i > 0 && (
              <line x1={buildingX} y1={yTop + zoneH} x2={buildingX + buildingW} y2={yTop + zoneH}
                stroke="#333" strokeWidth="0.5" strokeDasharray="3,3" />
            )}

            {/* Windward arrow */}
            {wLen > 2 && (
              <>
                <line x1={wX1} y1={yMid} x2={wX2} y2={yMid}
                  stroke="#cc0000" strokeWidth="1.5" />
                <polygon
                  points={`${wX2},${yMid} ${wX2 - 5},${yMid - 3} ${wX2 - 5},${yMid + 3}`}
                  fill="#cc0000" />
                <text x={wX1 - 3} y={yMid + 3} textAnchor="end" fill="#cc0000"
                  fontSize="8" fontFamily="Space Grotesk, monospace">
                  {fmt(zone.wNetWindward / 1000, 2)}
                </text>
              </>
            )}

            {/* Leeward arrow */}
            {lLen > 2 && (
              <>
                <line x1={lX1} y1={yMid} x2={lX2} y2={yMid}
                  stroke="#4488cc" strokeWidth="1.5" strokeDasharray="4,2" />
                <polygon
                  points={`${lX2},${yMid} ${lX2 - 5},${yMid - 3} ${lX2 - 5},${yMid + 3}`}
                  fill="#4488cc" />
                <text x={lX2 + 3} y={yMid + 3} textAnchor="start" fill="#4488cc"
                  fontSize="8" fontFamily="Space Grotesk, monospace">
                  {fmt(Math.abs(zone.wNetLeeward) / 1000, 2)}
                </text>
              </>
            )}

            {/* Zone height label */}
            <text x={buildingX + buildingW / 2} y={yMid + 3} textAnchor="middle" fill="#666"
              fontSize="8" fontFamily="Space Grotesk, monospace">
              z={fmt(zone.z, 1)}
            </text>
          </g>
        )
      })}

      {/* Dimension: height h */}
      <line x1={buildingX - 60} y1={buildingTop} x2={buildingX - 60} y2={buildingBot} stroke="#444" strokeWidth="0.8" />
      <line x1={buildingX - 65} y1={buildingTop} x2={buildingX - 55} y2={buildingTop} stroke="#444" strokeWidth="0.8" />
      <line x1={buildingX - 65} y1={buildingBot} x2={buildingX - 55} y2={buildingBot} stroke="#444" strokeWidth="0.8" />
      <text x={buildingX - 60} y={buildingTop + drawH / 2} textAnchor="middle" fill="#888"
        fontSize="10" fontFamily="Space Grotesk, monospace" transform={`rotate(-90, ${buildingX - 60}, ${buildingTop + drawH / 2})`}>
        h = {fmt(h, 1)} m
      </text>

      {/* Dimension: width d (depth parallel to wind) */}
      <line x1={buildingX} y1={buildingBot + 16} x2={buildingX + buildingW} y2={buildingBot + 16} stroke="#444" strokeWidth="0.8" />
      <line x1={buildingX} y1={buildingBot + 12} x2={buildingX} y2={buildingBot + 20} stroke="#444" strokeWidth="0.8" />
      <line x1={buildingX + buildingW} y1={buildingBot + 12} x2={buildingX + buildingW} y2={buildingBot + 20} stroke="#444" strokeWidth="0.8" />
      <text x={buildingX + buildingW / 2} y={buildingBot + 28} textAnchor="middle" fill="#888"
        fontSize="9" fontFamily="Space Grotesk, monospace">
        d = {fmt(d, 1)} m
      </text>

      {/* Wind direction arrow */}
      <line x1={margin.left - 30} y1={margin.top - 10} x2={margin.left + 10} y2={margin.top - 10}
        stroke="#cc0000" strokeWidth="1.5" />
      <polygon points={`${margin.left + 10},${margin.top - 10} ${margin.left + 4},${margin.top - 14} ${margin.left + 4},${margin.top - 6}`}
        fill="#cc0000" />
      <text x={margin.left - 10} y={margin.top - 16} textAnchor="middle" fill="#cc0000"
        fontSize="9" fontFamily="Inter, sans-serif" fontWeight="600">
        WIND
      </text>

      {/* Legend */}
      <line x1={svgW - 100} y1={svgH - 20} x2={svgW - 80} y2={svgH - 20} stroke="#cc0000" strokeWidth="1.5" />
      <text x={svgW - 76} y={svgH - 17} fill="#888" fontSize="8" fontFamily="Inter, sans-serif">Windward (kN/m2)</text>
      <line x1={svgW - 100} y1={svgH - 8} x2={svgW - 80} y2={svgH - 8} stroke="#4488cc" strokeWidth="1.5" strokeDasharray="4,2" />
      <text x={svgW - 76} y={svgH - 5} fill="#888" fontSize="8" fontFamily="Inter, sans-serif">Leeward (kN/m2)</text>
    </svg>
  )
}

// ── Pressure Profile Plot ───────────────────────────────────────────────────

interface ProfileProps {
  h: number
  zones: ZonePressureResult[]
  code: 'EC1' | 'ASCE7'
}

export function PressureProfilePlot({ h, zones, code }: ProfileProps) {
  const svgW = 480
  const svgH = 240
  const margin = { top: 20, right: 30, bottom: 35, left: 55 }
  const plotW = svgW - margin.left - margin.right
  const plotH = svgH - margin.top - margin.bottom

  if (zones.length === 0 || h <= 0) {
    return (
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
        <text x={svgW / 2} y={svgH / 2} textAnchor="middle" fill="#555" fontSize="12" fontFamily="Inter, sans-serif">
          No data
        </text>
      </svg>
    )
  }

  const maxQ = Math.max(...zones.map(z => z.qp), 1)

  // Build points for the qp curve
  const points = zones.map((z, i) => {
    const x = margin.left + (z.qp / maxQ) * plotW
    const y = margin.top + plotH - (z.z / h) * plotH
    return { x, y, z: z.z, qp: z.qp }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')

  // Y axis ticks
  const yTicks = 5
  const zStep = h / yTicks

  // X axis ticks
  const xTicks = 5
  const qStep = maxQ / xTicks

  const pressureLabel = code === 'EC1' ? 'qp(z)' : 'qz'

  return (
    <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ maxWidth: '480px' }}>
      {/* Grid */}
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const y = margin.top + plotH - (i * zStep / h) * plotH
        return (
          <g key={`yg${i}`}>
            <line x1={margin.left} y1={y} x2={margin.left + plotW} y2={y} stroke="#1a1a1a" strokeWidth="0.5" />
            <text x={margin.left - 6} y={y + 3} textAnchor="end" fill="#555" fontSize="8" fontFamily="Space Grotesk, monospace">
              {fmt(i * zStep, 0)}
            </text>
          </g>
        )
      })}
      {Array.from({ length: xTicks + 1 }).map((_, i) => {
        const x = margin.left + (i * qStep / maxQ) * plotW
        return (
          <g key={`xg${i}`}>
            <line x1={x} y1={margin.top} x2={x} y2={margin.top + plotH} stroke="#1a1a1a" strokeWidth="0.5" />
            <text x={x} y={margin.top + plotH + 14} textAnchor="middle" fill="#555" fontSize="8" fontFamily="Space Grotesk, monospace">
              {fmt(i * qStep, 0)}
            </text>
          </g>
        )
      })}

      {/* Axes */}
      <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + plotH} stroke="#333" strokeWidth="1" />
      <line x1={margin.left} y1={margin.top + plotH} x2={margin.left + plotW} y2={margin.top + plotH} stroke="#333" strokeWidth="1" />

      {/* Axis labels */}
      <text x={margin.left - 35} y={margin.top + plotH / 2} textAnchor="middle" fill="#666" fontSize="9"
        fontFamily="Inter, sans-serif" transform={`rotate(-90, ${margin.left - 35}, ${margin.top + plotH / 2})`}>
        Height z (m)
      </text>
      <text x={margin.left + plotW / 2} y={svgH - 4} textAnchor="middle" fill="#666" fontSize="9" fontFamily="Inter, sans-serif">
        {pressureLabel} (Pa)
      </text>

      {/* Pressure curve */}
      <path d={pathD} fill="none" stroke="#cc0000" strokeWidth="2" />

      {/* Data points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#cc0000" stroke="#0a0a0a" strokeWidth="1" />
      ))}
    </svg>
  )
}
