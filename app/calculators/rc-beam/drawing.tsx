'use client'

import { type SectionType, type DesignCode, fmt, barArea, EC2_BAR_LABELS, ACI_BAR_LABELS, EC2_BAR_DIAMETERS } from './types'

interface DrawingProps {
  b: number
  h: number
  d: number
  d_prime: number
  cnom: number
  stirrupDia: number
  sectionType: SectionType
  beff: number
  bw: number
  hf: number
  tensionBars: { dia: number; count: number; diaIdx: number }[]
  compressionBars: { dia: number; count: number } | null
  code: DesignCode
}

export function SectionDrawing({
  b, h, d, d_prime, cnom, stirrupDia, sectionType, beff, bw, hf,
  tensionBars, compressionBars, code,
}: DrawingProps) {
  const svgW = 360
  const svgH = 420
  const margin = 55
  const drawW = svgW - 2 * margin
  const drawH = svgH - 2 * margin

  const actualW = sectionType === 'rectangular' ? b : beff
  const scaleX = drawW / Math.max(actualW, 1)
  const scaleY = drawH / Math.max(h, 1)
  const scale = Math.min(scaleX, scaleY)

  const rectW = actualW * scale
  const rectH = h * scale
  const oX = (svgW - rectW) / 2
  const oY = (svgH - rectH) / 2 - 15

  const coverPx = cnom * scale
  const stirPx = stirrupDia * scale

  const isT = sectionType === 'T-beam'
  const isL = sectionType === 'L-beam'
  const isFlange = isT || isL

  const flangeW = isFlange ? beff * scale : rectW
  const webW = bw * scale
  const flangeH = hf * scale
  const webOffX = isFlange ? oX + (flangeW - webW) / 2 : oX

  const mainBarDia = tensionBars[0]?.dia ?? 20
  const barR = Math.max(mainBarDia * scale / 2, 4)

  const barStartX = (isFlange ? webOffX : oX) + coverPx + stirPx + barR
  const barEndX = (isFlange ? webOffX + webW : oX + rectW) - coverPx - stirPx - barR

  const allTensionBars: { cx: number; cy: number; dia: number; layer: number }[] = []
  let layerY = oY + rectH - coverPx - stirPx - barR
  for (let li = 0; li < tensionBars.length; li++) {
    const layer = tensionBars[li]
    const r = Math.max(layer.dia * scale / 2, 3)
    const sX = barStartX
    const eX = barEndX
    for (let i = 0; i < layer.count; i++) {
      const cx = layer.count === 1 ? (sX + eX) / 2 : sX + (eX - sX) * i / (layer.count - 1)
      allTensionBars.push({ cx, cy: layerY, dia: layer.dia, layer: li })
    }
    if (li < tensionBars.length - 1) {
      const gap = Math.max(20, mainBarDia) * scale
      layerY -= gap + r * 2
    }
  }

  const compBars: { cx: number; cy: number }[] = []
  if (compressionBars && compressionBars.count > 0) {
    const compR = Math.max(compressionBars.dia * scale / 2, 3)
    const compY = oY + coverPx + stirPx + compR
    for (let i = 0; i < compressionBars.count; i++) {
      const cx = compressionBars.count === 1 ? (barStartX + barEndX) / 2 : barStartX + (barEndX - barStartX) * i / (compressionBars.count - 1)
      compBars.push({ cx, cy: compY })
    }
  }

  const dPx = d * scale
  const dPrimePx = d_prime * scale

  const totalAs = tensionBars.reduce((sum, l) => sum + l.count * barArea(l.dia), 0)
  const barLabel = tensionBars.map(l => {
    const lbl = code === 'EC2'
      ? EC2_BAR_LABELS[EC2_BAR_DIAMETERS.indexOf(l.dia)] ?? `Ø${l.dia}`
      : ACI_BAR_LABELS[l.diaIdx] ?? `Ø${l.dia}`
    return `${l.count}${lbl}`
  }).join(' + ')

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', maxWidth: '360px', height: 'auto' }}>
      <defs>
        <pattern id="concrete-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#2a2a2a" strokeWidth="0.5" />
        </pattern>
      </defs>

      {/* Concrete section */}
      {isFlange ? (
        <>
          {/* Flange */}
          <rect x={oX} y={oY} width={flangeW} height={flangeH} fill="#151515" stroke="#444" strokeWidth="2" />
          {/* Web */}
          <rect x={webOffX} y={oY + flangeH} width={webW} height={rectH - flangeH} fill="#151515" stroke="#444" strokeWidth="2" />
          {isL && (
            <rect x={oX} y={oY} width={flangeW * 0.5} height={flangeH} fill="#151515" stroke="#444" strokeWidth="2" />
          )}
        </>
      ) : (
        <rect x={oX} y={oY} width={rectW} height={rectH} fill="#151515" stroke="#444" strokeWidth="2" />
      )}

      {/* Stirrup outline */}
      {isFlange ? (
        <rect
          x={webOffX + coverPx} y={oY + coverPx}
          width={webW - 2 * coverPx} height={rectH - 2 * coverPx}
          fill="none" stroke="#555" strokeWidth="1.5" rx="3"
        />
      ) : (
        <rect
          x={oX + coverPx} y={oY + coverPx}
          width={rectW - 2 * coverPx} height={rectH - 2 * coverPx}
          fill="none" stroke="#555" strokeWidth="1.5" rx="3"
        />
      )}

      {/* d dimension line (left side) */}
      <line x1={oX - 20} y1={oY} x2={oX - 20} y2={oY + dPx} stroke="#cc0000" strokeWidth="0.8" />
      <line x1={oX - 26} y1={oY} x2={oX - 14} y2={oY} stroke="#cc0000" strokeWidth="0.8" />
      <line x1={oX - 26} y1={oY + dPx} x2={oX - 14} y2={oY + dPx} stroke="#cc0000" strokeWidth="0.8" />
      <text x={oX - 28} y={oY + dPx / 2 + 4} textAnchor="end" fill="#cc0000" fontSize="10" fontFamily="monospace" fontWeight="bold">
        d={fmt(d, 0)}
      </text>

      {/* d dashed line */}
      <line x1={oX} y1={oY + dPx} x2={oX + rectW} y2={oY + dPx} stroke="#cc0000" strokeWidth="0.8" strokeDasharray="4,3" opacity="0.4" />

      {/* b dimension (bottom) */}
      <line x1={isFlange ? webOffX : oX} y1={oY + rectH + 18} x2={isFlange ? webOffX + webW : oX + rectW} y2={oY + rectH + 18} stroke="#888" strokeWidth="0.8" />
      <line x1={isFlange ? webOffX : oX} y1={oY + rectH + 14} x2={isFlange ? webOffX : oX} y2={oY + rectH + 22} stroke="#888" strokeWidth="0.8" />
      <line x1={isFlange ? webOffX + webW : oX + rectW} y1={oY + rectH + 14} x2={isFlange ? webOffX + webW : oX + rectW} y2={oY + rectH + 22} stroke="#888" strokeWidth="0.8" />
      <text x={isFlange ? webOffX + webW / 2 : oX + rectW / 2} y={oY + rectH + 32} textAnchor="middle" fill="#888" fontSize="10" fontFamily="monospace">
        {isFlange ? `bw=${bw}` : `b=${b}`}
      </text>

      {/* h dimension (right side) */}
      <line x1={oX + rectW + 18} y1={oY} x2={oX + rectW + 18} y2={oY + rectH} stroke="#888" strokeWidth="0.8" />
      <line x1={oX + rectW + 14} y1={oY} x2={oX + rectW + 22} y2={oY} stroke="#888" strokeWidth="0.8" />
      <line x1={oX + rectW + 14} y1={oY + rectH} x2={oX + rectW + 22} y2={oY + rectH} stroke="#888" strokeWidth="0.8" />
      <text
        x={oX + rectW + 30} y={oY + rectH / 2 + 4}
        textAnchor="middle" fill="#888" fontSize="10" fontFamily="monospace"
        transform={`rotate(90, ${oX + rectW + 30}, ${oY + rectH / 2})`}
      >
        h={h}
      </text>

      {/* Flange dimensions */}
      {isFlange && (
        <>
          <line x1={oX} y1={oY - 12} x2={oX + flangeW} y2={oY - 12} stroke="#888" strokeWidth="0.8" />
          <line x1={oX} y1={oY - 16} x2={oX} y2={oY - 8} stroke="#888" strokeWidth="0.8" />
          <line x1={oX + flangeW} y1={oY - 16} x2={oX + flangeW} y2={oY - 8} stroke="#888" strokeWidth="0.8" />
          <text x={oX + flangeW / 2} y={oY - 18} textAnchor="middle" fill="#888" fontSize="9" fontFamily="monospace">beff={beff}</text>
          <text x={oX + flangeW + 4} y={oY + flangeH / 2 + 3} fill="#666" fontSize="8" fontFamily="monospace">hf={hf}</text>
        </>
      )}

      {/* Cover label */}
      <text x={(isFlange ? webOffX : oX) + 6} y={oY + rectH - 6} fill="#444" fontSize="8" fontFamily="monospace">c={cnom}</text>

      {/* Tension bars */}
      {allTensionBars.map((bar, i) => (
        <g key={`t${i}`}>
          <circle cx={bar.cx} cy={bar.cy} r={Math.max(bar.dia * scale / 2, 3)} fill="#cc0000" />
          <circle cx={bar.cx} cy={bar.cy} r={Math.max(bar.dia * scale / 2, 3) + 1} fill="none" stroke="#cc0000" strokeWidth="0.5" opacity="0.3" />
        </g>
      ))}

      {/* Compression bars */}
      {compBars.map((bar, i) => (
        <g key={`c${i}`}>
          <circle cx={bar.cx} cy={bar.cy} r={Math.max((compressionBars?.dia ?? 12) * scale / 2, 2.5)} fill="none" stroke="#cc0000" strokeWidth="1.5" />
        </g>
      ))}

      {/* d' dimension */}
      {compressionBars && compressionBars.count > 0 && (
        <>
          <line x1={oX + rectW + 6} y1={oY} x2={oX + rectW + 6} y2={oY + dPrimePx} stroke="#888" strokeWidth="0.6" strokeDasharray="2,2" />
          <text x={oX + rectW + 10} y={oY + dPrimePx / 2 + 3} fill="#666" fontSize="8" fontFamily="monospace">d&apos;={fmt(d_prime, 0)}</text>
        </>
      )}

      {/* Bar label */}
      <text
        x={isFlange ? webOffX + webW / 2 : oX + rectW / 2}
        y={oY + rectH - coverPx - stirPx - barR * 2 - 8}
        textAnchor="middle" fill="#cc0000" fontSize="10" fontFamily="monospace" fontWeight="bold"
      >
        {barLabel}
      </text>
      <text
        x={isFlange ? webOffX + webW / 2 : oX + rectW / 2}
        y={oY + rectH - coverPx - stirPx - barR * 2 - 20}
        textAnchor="middle" fill="#555" fontSize="9" fontFamily="monospace"
      >
        As={fmt(totalAs, 0)} mm²
      </text>
    </svg>
  )
}
