'use client'

import { type SteelSection, fmt } from './types'

interface DrawingProps {
  section: SteelSection
}

export function SectionDrawing({ section }: DrawingProps) {
  const svgW = 360
  const svgH = 420
  const margin = 60
  const drawW = svgW - 2 * margin
  const drawH = svgH - 2 * margin

  const { h, b, tw, tf, r } = section

  const scaleX = drawW / Math.max(b, 1)
  const scaleY = drawH / Math.max(h, 1)
  const scale = Math.min(scaleX, scaleY)

  const sW = b * scale          // scaled flange width
  const sH = h * scale          // scaled total height
  const sTw = tw * scale        // scaled web thickness
  const sTf = tf * scale        // scaled flange thickness
  const sR = r * scale          // scaled fillet radius

  const oX = (svgW - sW) / 2
  const oY = (svgH - sH) / 2 - 10

  // I-beam path
  const cx = oX + sW / 2
  const webL = cx - sTw / 2
  const webR = cx + sTw / 2

  const path = [
    // Top flange - clockwise from top-left
    `M ${oX} ${oY}`,
    `L ${oX + sW} ${oY}`,
    `L ${oX + sW} ${oY + sTf}`,
    // Top right fillet
    `L ${webR + sR} ${oY + sTf}`,
    `Q ${webR} ${oY + sTf} ${webR} ${oY + sTf + sR}`,
    // Right web
    `L ${webR} ${oY + sH - sTf - sR}`,
    // Bottom right fillet
    `Q ${webR} ${oY + sH - sTf} ${webR + sR} ${oY + sH - sTf}`,
    // Bottom flange
    `L ${oX + sW} ${oY + sH - sTf}`,
    `L ${oX + sW} ${oY + sH}`,
    `L ${oX} ${oY + sH}`,
    `L ${oX} ${oY + sH - sTf}`,
    // Bottom left fillet
    `L ${webL - sR} ${oY + sH - sTf}`,
    `Q ${webL} ${oY + sH - sTf} ${webL} ${oY + sH - sTf - sR}`,
    // Left web
    `L ${webL} ${oY + sTf + sR}`,
    // Top left fillet
    `Q ${webL} ${oY + sTf} ${webL - sR} ${oY + sTf}`,
    `L ${oX} ${oY + sTf}`,
    `Z`,
  ].join(' ')

  // Dimension positions
  const dimOffset = 22

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', maxWidth: '360px', height: 'auto' }}>
      {/* Section fill */}
      <path d={path} fill="#151515" stroke="#555" strokeWidth="2" />

      {/* Center cross-hatch lines for visual texture */}
      <line x1={cx} y1={oY + sTf} x2={cx} y2={oY + sH - sTf} stroke="#222" strokeWidth="0.5" strokeDasharray="4,4" />

      {/* ── h dimension (right side) ── */}
      <line x1={oX + sW + dimOffset} y1={oY} x2={oX + sW + dimOffset} y2={oY + sH} stroke="#888" strokeWidth="0.8" />
      <line x1={oX + sW + dimOffset - 5} y1={oY} x2={oX + sW + dimOffset + 5} y2={oY} stroke="#888" strokeWidth="0.8" />
      <line x1={oX + sW + dimOffset - 5} y1={oY + sH} x2={oX + sW + dimOffset + 5} y2={oY + sH} stroke="#888" strokeWidth="0.8" />
      <text
        x={oX + sW + dimOffset + 8} y={oY + sH / 2 + 4}
        textAnchor="middle" fill="#888" fontSize="10" fontFamily="monospace"
        transform={`rotate(90, ${oX + sW + dimOffset + 8}, ${oY + sH / 2})`}
      >
        h={h}
      </text>

      {/* ── b dimension (bottom) ── */}
      <line x1={oX} y1={oY + sH + dimOffset} x2={oX + sW} y2={oY + sH + dimOffset} stroke="#888" strokeWidth="0.8" />
      <line x1={oX} y1={oY + sH + dimOffset - 5} x2={oX} y2={oY + sH + dimOffset + 5} stroke="#888" strokeWidth="0.8" />
      <line x1={oX + sW} y1={oY + sH + dimOffset - 5} x2={oX + sW} y2={oY + sH + dimOffset + 5} stroke="#888" strokeWidth="0.8" />
      <text x={oX + sW / 2} y={oY + sH + dimOffset + 14} textAnchor="middle" fill="#888" fontSize="10" fontFamily="monospace">
        b={b}
      </text>

      {/* ── tw dimension (at mid height) ── */}
      <line x1={webL} y1={oY + sH / 2 + 10} x2={webR} y2={oY + sH / 2 + 10} stroke="#cc0000" strokeWidth="0.8" />
      <line x1={webL} y1={oY + sH / 2 + 6} x2={webL} y2={oY + sH / 2 + 14} stroke="#cc0000" strokeWidth="0.8" />
      <line x1={webR} y1={oY + sH / 2 + 6} x2={webR} y2={oY + sH / 2 + 14} stroke="#cc0000" strokeWidth="0.8" />
      <text x={cx} y={oY + sH / 2 + 24} textAnchor="middle" fill="#cc0000" fontSize="9" fontFamily="monospace" fontWeight="bold">
        tw={tw}
      </text>

      {/* ── tf dimension (top flange, left side) ── */}
      <line x1={oX - dimOffset} y1={oY} x2={oX - dimOffset} y2={oY + sTf} stroke="#cc0000" strokeWidth="0.8" />
      <line x1={oX - dimOffset - 5} y1={oY} x2={oX - dimOffset + 5} y2={oY} stroke="#cc0000" strokeWidth="0.8" />
      <line x1={oX - dimOffset - 5} y1={oY + sTf} x2={oX - dimOffset + 5} y2={oY + sTf} stroke="#cc0000" strokeWidth="0.8" />
      <text x={oX - dimOffset - 8} y={oY + sTf / 2 + 4} textAnchor="end" fill="#cc0000" fontSize="9" fontFamily="monospace" fontWeight="bold">
        tf={tf}
      </text>

      {/* ── tf dashed lines ── */}
      <line x1={oX} y1={oY + sTf} x2={oX + sW} y2={oY + sTf} stroke="#333" strokeWidth="0.5" strokeDasharray="3,3" />
      <line x1={oX} y1={oY + sH - sTf} x2={oX + sW} y2={oY + sH - sTf} stroke="#333" strokeWidth="0.5" strokeDasharray="3,3" />

      {/* ── r fillet indicator ── */}
      <circle cx={webR + sR * 0.5} cy={oY + sTf + sR * 0.5} r={2} fill="none" stroke="#666" strokeWidth="0.8" />
      <text x={webR + sR + 6} y={oY + sTf + sR + 2} fill="#666" fontSize="8" fontFamily="monospace">
        r={r}
      </text>

      {/* Section label */}
      <text x={svgW / 2} y={oY - 8} textAnchor="middle" fill="#cc0000" fontSize="12" fontFamily="monospace" fontWeight="bold">
        {section.label}
      </text>

      {/* Properties summary */}
      <text x={svgW / 2} y={oY + sH + dimOffset + 32} textAnchor="middle" fill="#555" fontSize="9" fontFamily="monospace">
        A={fmt(section.A, 0)} mm2 | Iy={fmt(section.Iy, 1)}x10^6 mm4
      </text>
    </svg>
  )
}
