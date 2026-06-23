'use client'

import { type SlabType, type SupportCondition, type PanelType, fmt, areaPerMeter } from './types'

interface SlabDrawingProps {
  slabType: SlabType
  lx: number
  ly: number
  h: number
  dx: number
  dy: number
  cnom: number
  barDiaX: number
  spacingX: number
  barDiaY: number
  spacingY: number
  support: SupportCondition
  panelType: PanelType
  code: 'EC2' | 'ACI'
  barLabelX: string
  barLabelY: string
}

function SupportSymbol({ x, y, type, rotation = 0 }: { x: number; y: number; type: 'pin' | 'roller' | 'fixed' | 'free'; rotation?: number }) {
  const g = `translate(${x},${y}) rotate(${rotation})`
  if (type === 'fixed') {
    return (
      <g transform={g}>
        <line x1="-10" y1="0" x2="10" y2="0" stroke="#666" strokeWidth="2" />
        {[-8, -4, 0, 4, 8].map(dx => (
          <line key={dx} x1={dx} y1="0" x2={dx - 4} y2="6" stroke="#666" strokeWidth="1" />
        ))}
      </g>
    )
  }
  if (type === 'roller') {
    return (
      <g transform={g}>
        <polygon points="0,-2 -8,8 8,8" fill="none" stroke="#666" strokeWidth="1.5" />
        <circle cx="0" cy="11" r="3" fill="none" stroke="#666" strokeWidth="1" />
        <line x1="-10" y1="15" x2="10" y2="15" stroke="#666" strokeWidth="1" />
      </g>
    )
  }
  if (type === 'pin') {
    return (
      <g transform={g}>
        <polygon points="0,-2 -8,8 8,8" fill="none" stroke="#666" strokeWidth="1.5" />
        <line x1="-10" y1="9" x2="10" y2="9" stroke="#666" strokeWidth="1" />
      </g>
    )
  }
  return null
}

function getSupportType(cond: SupportCondition): 'pin' | 'roller' | 'fixed' | 'free' {
  switch (cond) {
    case 'cantilever': return 'fixed'
    case 'simply_supported': return 'pin'
    case 'one_end_continuous': return 'pin'
    case 'both_ends_continuous': return 'pin'
  }
}

// Cross-section drawing for one-way slab
function CrossSection({ h, dx, cnom, barDiaX, spacingX, barDiaY, spacingY, barLabelX, barLabelY, code }: {
  h: number; dx: number; cnom: number
  barDiaX: number; spacingX: number
  barDiaY: number; spacingY: number
  barLabelX: string; barLabelY: string
  code: 'EC2' | 'ACI'
}) {
  const svgW = 340
  const svgH = 200
  const margin = { top: 20, right: 50, bottom: 30, left: 50 }

  const drawW = 220
  const drawH = Math.min(140, svgH - margin.top - margin.bottom)
  const scale = drawH / Math.max(h, 1)

  const rectH = h * scale
  const rectW = drawW
  const oX = (svgW - rectW) / 2
  const oY = margin.top

  const coverPx = cnom * scale
  const barRx = Math.max(barDiaX * scale / 2, 3)
  const barRy = Math.max(barDiaY * scale / 2, 2.5)

  const numBarsX = Math.floor(drawW / (spacingX * scale * 0.9)) + 1
  const actualBarsX = Math.min(numBarsX, 7)
  const barSpacePx_x = rectW / (actualBarsX + 1)

  const yBottom = oY + rectH - coverPx - barRx
  const yTop = yBottom - barRx - barRy

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', maxWidth: '340px', height: 'auto' }}>
      {/* Concrete section */}
      <rect x={oX} y={oY} width={rectW} height={rectH} fill="#151515" stroke="#444" strokeWidth="2" />

      {/* Hatch lines */}
      <defs>
        <pattern id="slab-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#222" strokeWidth="0.5" />
        </pattern>
        <clipPath id="slab-clip">
          <rect x={oX} y={oY} width={rectW} height={rectH} />
        </clipPath>
      </defs>
      <rect x={oX} y={oY} width={rectW} height={rectH} fill="url(#slab-hatch)" clipPath="url(#slab-clip)" />

      {/* X-direction bars (bottom layer) */}
      {Array.from({ length: actualBarsX }).map((_, i) => {
        const cx = oX + barSpacePx_x * (i + 1)
        return (
          <g key={`bx${i}`}>
            <circle cx={cx} cy={yBottom} r={barRx} fill="#cc0000" />
            <circle cx={cx} cy={yBottom} r={barRx + 1} fill="none" stroke="#cc0000" strokeWidth="0.4" opacity="0.3" />
          </g>
        )
      })}

      {/* Y-direction bars (second layer from bottom) */}
      {Array.from({ length: Math.min(actualBarsX - 1, 6) }).map((_, i) => {
        const cx = oX + barSpacePx_x * (i + 1) + barSpacePx_x / 2
        return (
          <g key={`by${i}`}>
            <circle cx={cx} cy={yTop} r={barRy} fill="none" stroke="#cc0000" strokeWidth="1.5" />
          </g>
        )
      })}

      {/* h dimension (right) */}
      <line x1={oX + rectW + 12} y1={oY} x2={oX + rectW + 12} y2={oY + rectH} stroke="#888" strokeWidth="0.8" />
      <line x1={oX + rectW + 8} y1={oY} x2={oX + rectW + 16} y2={oY} stroke="#888" strokeWidth="0.8" />
      <line x1={oX + rectW + 8} y1={oY + rectH} x2={oX + rectW + 16} y2={oY + rectH} stroke="#888" strokeWidth="0.8" />
      <text x={oX + rectW + 20} y={oY + rectH / 2 + 4} fill="#888" fontSize="9" fontFamily="monospace" textAnchor="start">h={h}</text>

      {/* d dimension (left) */}
      <line x1={oX - 12} y1={oY} x2={oX - 12} y2={oY + dx * scale} stroke="#cc0000" strokeWidth="0.8" />
      <line x1={oX - 16} y1={oY} x2={oX - 8} y2={oY} stroke="#cc0000" strokeWidth="0.8" />
      <line x1={oX - 16} y1={oY + dx * scale} x2={oX - 8} y2={oY + dx * scale} stroke="#cc0000" strokeWidth="0.8" />
      <text x={oX - 18} y={oY + dx * scale / 2 + 3} fill="#cc0000" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="end">d={fmt(dx, 0)}</text>

      {/* d dashed line */}
      <line x1={oX} y1={oY + dx * scale} x2={oX + rectW} y2={oY + dx * scale} stroke="#cc0000" strokeWidth="0.6" strokeDasharray="3,2" opacity="0.4" />

      {/* Cover label */}
      <text x={oX + 4} y={oY + rectH - 4} fill="#444" fontSize="7" fontFamily="monospace">c={cnom}</text>

      {/* Bar labels */}
      <text x={oX + rectW / 2} y={oY + rectH + 16} textAnchor="middle" fill="#cc0000" fontSize="9" fontFamily="monospace" fontWeight="bold">
        {barLabelX} (bottom)
      </text>
      <text x={oX + rectW / 2} y={oY + rectH + 28} textAnchor="middle" fill="#888" fontSize="8" fontFamily="monospace">
        {barLabelY} (top layer)
      </text>
    </svg>
  )
}

// Plan view for two-way slab
function PlanView({ lx, ly, barLabelX, barLabelY, panelType, spacingX, spacingY }: {
  lx: number; ly: number
  barLabelX: string; barLabelY: string
  panelType: PanelType
  spacingX: number; spacingY: number
}) {
  const svgW = 360
  const svgH = 300
  const margin = 50

  const drawW = svgW - 2 * margin
  const drawH = svgH - 2 * margin
  const aspectRatio = ly / lx
  let rectW: number, rectH: number

  if (aspectRatio >= 1) {
    rectW = drawW
    rectH = Math.min(drawW / aspectRatio, drawH)
  } else {
    rectH = drawH
    rectW = Math.min(drawH * aspectRatio, drawW)
  }

  const oX = (svgW - rectW) / 2
  const oY = (svgH - rectH) / 2 - 5

  const numBarsX = Math.min(Math.max(Math.floor(rectW / 15), 4), 12)
  const numBarsY = Math.min(Math.max(Math.floor(rectH / 15), 4), 12)

  const edgeTypes = panelType === 'interior'
    ? ['continuous', 'continuous', 'continuous', 'continuous']
    : panelType === 'edge'
    ? ['continuous', 'continuous', 'continuous', 'free']
    : panelType === 'corner'
    ? ['continuous', 'free', 'continuous', 'free']
    : ['fixed', 'free', 'free', 'free']

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', maxWidth: '360px', height: 'auto' }}>
      {/* Slab outline */}
      <rect x={oX} y={oY} width={rectW} height={rectH} fill="#0d0d0d" stroke="#555" strokeWidth="2" />

      {/* Edge condition indicators */}
      {/* Top edge */}
      {edgeTypes[0] === 'continuous' && <line x1={oX} y1={oY - 3} x2={oX + rectW} y2={oY - 3} stroke="#cc0000" strokeWidth="3" />}
      {/* Right edge */}
      {edgeTypes[1] === 'continuous' && <line x1={oX + rectW + 3} y1={oY} x2={oX + rectW + 3} y2={oY + rectH} stroke="#cc0000" strokeWidth="3" />}
      {/* Bottom edge */}
      {edgeTypes[2] === 'continuous' && <line x1={oX} y1={oY + rectH + 3} x2={oX + rectW} y2={oY + rectH + 3} stroke="#cc0000" strokeWidth="3" />}
      {/* Left edge */}
      {edgeTypes[3] === 'continuous' && <line x1={oX - 3} y1={oY} x2={oX - 3} y2={oY + rectH} stroke="#cc0000" strokeWidth="3" />}

      {/* X-direction bars (horizontal lines) */}
      {Array.from({ length: numBarsY }).map((_, i) => {
        const y = oY + 10 + (rectH - 20) * i / (numBarsY - 1)
        return <line key={`xbar${i}`} x1={oX + 5} y1={y} x2={oX + rectW - 5} y2={y} stroke="#cc0000" strokeWidth="1" opacity="0.5" />
      })}

      {/* Y-direction bars (vertical lines) */}
      {Array.from({ length: numBarsX }).map((_, i) => {
        const x = oX + 10 + (rectW - 20) * i / (numBarsX - 1)
        return <line key={`ybar${i}`} x1={x} y1={oY + 5} x2={x} y2={oY + rectH - 5} stroke="#888" strokeWidth="0.8" opacity="0.4" strokeDasharray="4,3" />
      })}

      {/* lx dimension (bottom) */}
      <line x1={oX} y1={oY + rectH + 18} x2={oX + rectW} y2={oY + rectH + 18} stroke="#888" strokeWidth="0.8" />
      <line x1={oX} y1={oY + rectH + 14} x2={oX} y2={oY + rectH + 22} stroke="#888" strokeWidth="0.8" />
      <line x1={oX + rectW} y1={oY + rectH + 14} x2={oX + rectW} y2={oY + rectH + 22} stroke="#888" strokeWidth="0.8" />
      <text x={oX + rectW / 2} y={oY + rectH + 32} textAnchor="middle" fill="#888" fontSize="10" fontFamily="monospace">
        lx={fmt(lx / 1000, 2)}m
      </text>

      {/* ly dimension (right) */}
      <line x1={oX + rectW + 18} y1={oY} x2={oX + rectW + 18} y2={oY + rectH} stroke="#888" strokeWidth="0.8" />
      <line x1={oX + rectW + 14} y1={oY} x2={oX + rectW + 22} y2={oY} stroke="#888" strokeWidth="0.8" />
      <line x1={oX + rectW + 14} y1={oY + rectH} x2={oX + rectW + 22} y2={oY + rectH} stroke="#888" strokeWidth="0.8" />
      <text x={oX + rectW + 30} y={oY + rectH / 2} textAnchor="middle" fill="#888" fontSize="10" fontFamily="monospace" transform={`rotate(90, ${oX + rectW + 30}, ${oY + rectH / 2})`}>
        ly={fmt(ly / 1000, 2)}m
      </text>

      {/* Direction labels */}
      <text x={oX + rectW / 2} y={oY + rectH / 2 - 8} textAnchor="middle" fill="#cc0000" fontSize="9" fontFamily="monospace" fontWeight="bold">
        x: {barLabelX}
      </text>
      <text x={oX + rectW / 2} y={oY + rectH / 2 + 8} textAnchor="middle" fill="#888" fontSize="9" fontFamily="monospace">
        y: {barLabelY}
      </text>

      {/* Panel type label */}
      <text x={oX + rectW / 2} y={oY - 12} textAnchor="middle" fill="#555" fontSize="9" fontFamily="monospace" style={{ textTransform: 'uppercase' }}>
        {panelType} panel
      </text>

      {/* Edge labels (small) */}
      {edgeTypes[0] === 'continuous' && <text x={oX + rectW / 2} y={oY - 8} textAnchor="middle" fill="#cc0000" fontSize="7" fontFamily="monospace" opacity="0.6">cont.</text>}
      {edgeTypes[1] !== 'continuous' && <text x={oX + rectW + 8} y={oY + rectH / 2} fill="#555" fontSize="7" fontFamily="monospace" transform={`rotate(90, ${oX + rectW + 8}, ${oY + rectH / 2})`} textAnchor="middle">free</text>}
    </svg>
  )
}

// Main slab drawing component
export function SlabDrawing(props: SlabDrawingProps) {
  const { slabType, lx, ly, h, dx, dy, cnom, barDiaX, spacingX, barDiaY, spacingY, support, panelType, code, barLabelX, barLabelY } = props

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {slabType === 'two-way' && (
        <PlanView
          lx={lx} ly={ly}
          barLabelX={barLabelX} barLabelY={barLabelY}
          panelType={panelType}
          spacingX={spacingX} spacingY={spacingY}
        />
      )}
      <CrossSection
        h={h} dx={dx} cnom={cnom}
        barDiaX={barDiaX} spacingX={spacingX}
        barDiaY={barDiaY} spacingY={spacingY}
        barLabelX={barLabelX} barLabelY={barLabelY}
        code={code}
      />

      {/* One-way slab: show span with supports */}
      {slabType === 'one-way' && (
        <svg viewBox="0 0 340 60" style={{ width: '100%', maxWidth: '340px', height: 'auto' }}>
          <line x1="40" y1="25" x2="300" y2="25" stroke="#555" strokeWidth="2" />

          {/* Left support */}
          {support === 'cantilever' ? (
            <g>
              <line x1="40" y1="10" x2="40" y2="40" stroke="#666" strokeWidth="2.5" />
              {[14, 20, 26, 32, 38].map(yy => (
                <line key={yy} x1="40" y1={yy} x2="34" y2={yy + 5} stroke="#666" strokeWidth="1" />
              ))}
            </g>
          ) : (
            <SupportSymbol x={40} y={27} type="pin" />
          )}

          {/* Right support */}
          {support === 'cantilever' ? (
            <text x="300" y="45" textAnchor="middle" fill="#555" fontSize="8" fontFamily="monospace">free end</text>
          ) : support === 'both_ends_continuous' ? (
            <SupportSymbol x={300} y={27} type="pin" />
          ) : (
            <SupportSymbol x={300} y={27} type="roller" />
          )}

          {/* Continuous edge markers */}
          {(support === 'one_end_continuous' || support === 'both_ends_continuous') && (
            <line x1="40" y1="22" x2="40" y2="28" stroke="#cc0000" strokeWidth="4" />
          )}
          {support === 'both_ends_continuous' && (
            <line x1="300" y1="22" x2="300" y2="28" stroke="#cc0000" strokeWidth="4" />
          )}

          {/* Span dimension */}
          <text x="170" y="12" textAnchor="middle" fill="#888" fontSize="9" fontFamily="monospace">
            lx = {fmt(lx / 1000, 2)} m
          </text>
        </svg>
      )}
    </div>
  )
}
