import { useId, useRef, useState } from 'react'
import type { BeamType, PointLoad, UDLLoad, TrapezoidalLoad, MomentLoad, Reactions } from './calculations'

const RED = '#cc0000'
const RED_LIGHT = '#ff4444'
const GRAY = '#999'
const GRID_COLOR = '#222'

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi)
}

// Flattens JSX text children (mixed strings/numbers) into a plain string, used
// to size the readability backdrop drawn behind SVG labels.
function flattenText(node: React.ReactNode): string {
  if (Array.isArray(node)) return node.map(flattenText).join('')
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  return String(node)
}

// SVG text label with a dark backdrop rectangle so it stays readable when it
// sits over arrows, grid lines or filled chart areas.
function Label({
  x,
  y,
  anchor = 'middle',
  fontSize = 11,
  fontWeight,
  fill,
  children,
}: {
  x: number
  y: number
  anchor?: 'start' | 'middle' | 'end'
  fontSize?: number
  fontWeight?: number
  fill: string
  children: React.ReactNode
}) {
  const text = flattenText(children)
  const w = text.length * fontSize * 0.62 + 8
  const h = fontSize + 5
  const rectX = anchor === 'start' ? x - 4 : anchor === 'end' ? x - w + 4 : x - w / 2
  return (
    <>
      <rect x={rectX} y={y - fontSize * 0.78 - 2} width={w} height={h} fill="#0a0a0a" opacity={0.8} rx={2} />
      <text x={x} y={y} textAnchor={anchor} fontSize={fontSize} fontFamily="monospace" fontWeight={fontWeight} fill={fill}>
        {children}
      </text>
    </>
  )
}

// ---------------------------------------------------------------------------
// Layer-visibility options, driven by the pill toggles in page.tsx.
// ---------------------------------------------------------------------------
export interface BeamLayerOptions {
  pointLoads: boolean
  udl: boolean
  trapezoidal: boolean
  moments: boolean
  reactions: boolean
  dimensions: boolean
  labels: boolean
}

export const DEFAULT_BEAM_LAYERS: BeamLayerOptions = {
  pointLoads: true,
  udl: true,
  trapezoidal: true,
  moments: true,
  reactions: true,
  dimensions: true,
  labels: true,
}

export interface SupportMarker {
  position: number
  kind: 'pin' | 'roller' | 'fixed'
}

export interface ChartLayerOptions {
  grid: boolean
  keyPoints: boolean
  tooltip: boolean
}

export const DEFAULT_CHART_LAYERS: ChartLayerOptions = {
  grid: true,
  keyPoints: true,
  tooltip: true,
}

// ---------------------------------------------------------------------------
// Generic line + area chart used for the SFD, BMD and deflection diagrams.
// ---------------------------------------------------------------------------

// Linear interpolation of a sampled function at xq, used for the hover tooltip.
function interpAt(xq: number, xs: number[], values: number[]): number {
  const n = xs.length
  if (n === 0) return 0
  if (xq <= xs[0]) return values[0]
  if (xq >= xs[n - 1]) return values[n - 1]
  for (let i = 1; i < n; i++) {
    if (xs[i] >= xq) {
      const x0 = xs[i - 1]
      const x1 = xs[i]
      if (x1 - x0 < 1e-9) return values[i]
      const t = (xq - x0) / (x1 - x0)
      return values[i - 1] + t * (values[i] - values[i - 1])
    }
  }
  return values[n - 1]
}

interface KeyPointMarker {
  x: number
  value: number
  kind: 'max' | 'min' | 'zero'
}

// Finds the global max, min and zero-crossings of a sampled function, for
// the chart's red "key point" markers.
function findKeyPoints(xs: number[], values: number[]): KeyPointMarker[] {
  if (values.length === 0) return []
  let maxV = values[0]
  let maxX = xs[0]
  let minV = values[0]
  let minX = xs[0]
  for (let i = 1; i < values.length; i++) {
    if (values[i] > maxV) {
      maxV = values[i]
      maxX = xs[i]
    }
    if (values[i] < minV) {
      minV = values[i]
      minX = xs[i]
    }
  }
  const points: KeyPointMarker[] = [{ x: maxX, value: maxV, kind: 'max' }]
  if (Math.abs(minV - maxV) > 1e-9 || Math.abs(minX - maxX) > 1e-9) {
    points.push({ x: minX, value: minV, kind: 'min' })
  }
  const span = Math.max(1e-9, xs[xs.length - 1] - xs[0])
  for (let i = 0; i < values.length - 1; i++) {
    const v0 = values[i]
    const v1 = values[i + 1]
    if (v0 === 0 || v1 === 0 || v0 * v1 >= 0) continue
    const x0 = xs[i]
    const x1 = xs[i + 1]
    if (x1 - x0 < 1e-9) continue
    const t = -v0 / (v1 - v0)
    const xc = x0 + t * (x1 - x0)
    if (points.some((p) => Math.abs(p.x - xc) < span * 0.02)) continue
    points.push({ x: xc, value: 0, kind: 'zero' })
  }
  return points.slice(0, 5)
}

export function DiagramChart({
  x,
  values,
  length,
  color,
  flip = false,
  unit,
  lengthUnit,
  valueLabel,
  decimals = 2,
  fmt,
  layers = DEFAULT_CHART_LAYERS,
}: {
  x: number[]
  values: number[]
  length: number
  color: string
  flip?: boolean
  unit: string
  lengthUnit: string
  valueLabel: string
  decimals?: number
  fmt: (v: number, d?: number) => string
  layers?: ChartLayerOptions
}) {
  const gradientId = useId().replace(/[^a-zA-Z0-9]/g, '')
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<{ x: number; value: number } | null>(null)

  const width = 600
  const height = 200
  const padL = 50
  const padR = 14
  const padT = 16
  const padB = 30
  const plotW = width - padL - padR
  const plotH = height - padT - padB
  const baseline = padT + plotH / 2
  const amp = plotH / 2 - 8
  const maxAbs = Math.max(1e-9, ...values.map((v) => Math.abs(v)))
  const dir = flip ? -1 : 1
  const safeLength = Math.max(length, 1e-9)

  const xScale = (xi: number) => padL + (xi / safeLength) * plotW
  const yScale = (v: number) => baseline - dir * (v / maxAbs) * amp

  const pts = x.map((xi, i) => `${xScale(xi).toFixed(2)},${yScale(values[i]).toFixed(2)}`)
  const linePath = `M ${pts.join(' L ')}`
  const areaPath = `M ${xScale(x[0]).toFixed(2)},${baseline.toFixed(2)} L ${pts.join(' L ')} L ${xScale(
    x[x.length - 1]
  ).toFixed(2)},${baseline.toFixed(2)} Z`

  const keyPoints = layers.keyPoints ? findKeyPoints(x, values) : []
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * safeLength)
  const yTicks = [1, 0.5, 0, -0.5, -1].map((f) => f * maxAbs * dir)

  function dataXFromClientX(clientX: number): number | null {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    if (rect.width === 0) return null
    const relX = (clientX - rect.left) / rect.width
    const svgX = relX * width
    const dataX = ((svgX - padL) / plotW) * safeLength
    if (dataX < -safeLength * 0.02 || dataX > safeLength * 1.02) return null
    return clamp(dataX, x[0], x[x.length - 1])
  }

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const dataX = dataXFromClientX(e.clientX)
    if (dataX === null) {
      setHover(null)
      return
    }
    setHover({ x: dataX, value: interpAt(dataX, x, values) })
  }

  const tooltipLeft = hover !== null && hover.x > safeLength * 0.6
  const tooltipX = hover ? (tooltipLeft ? xScale(hover.x) - 130 : xScale(hover.x) + 8) : 0

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'none' }}
      preserveAspectRatio="none"
      onMouseMove={layers.tooltip ? handleMove : undefined}
      onMouseLeave={layers.tooltip ? () => setHover(null) : undefined}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>

      {/* Grid */}
      {layers.grid &&
        yTicks.map((tv, i) => {
          const y = yScale(tv)
          return (
            <g key={`hg-${i}`}>
              <line x1={padL} x2={width - padR} y1={y} y2={y} stroke={GRID_COLOR} strokeWidth={1} />
              <text x={padL - 6} y={y} dy={3} textAnchor="end" fill="#666" fontSize={9} fontFamily="monospace">
                {fmt(tv, decimals)}
                {i === 0 ? ` ${unit}` : ''}
              </text>
            </g>
          )
        })}
      {layers.grid &&
        xTicks.map((xv, i) => (
          <line key={`vg-${i}`} x1={xScale(xv)} x2={xScale(xv)} y1={padT} y2={height - padB} stroke={GRID_COLOR} strokeWidth={1} />
        ))}

      {/* Zero line */}
      <line x1={padL} x2={width - padR} y1={baseline} y2={baseline} stroke="#3a3a3a" strokeWidth={1.5} />

      {/* Area + curve */}
      <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      {/* X-axis labels */}
      {xTicks.map((xv, i) => (
        <text key={`xt-${i}`} x={xScale(xv)} y={height - padB + 14} textAnchor="middle" fill="#666" fontSize={9} fontFamily="monospace">
          {fmt(xv, 2)}
          {i === xTicks.length - 1 ? ` ${lengthUnit}` : ''}
        </text>
      ))}

      {/* Key point markers */}
      {keyPoints.map((kp, i) => {
        const px = xScale(kp.x)
        const py = yScale(kp.value)
        const anchor = px < padL + 55 ? 'start' : px > width - padR - 55 ? 'end' : 'middle'
        // Keep labels clear of the x-axis row at the bottom and the chart
        // edge at the top, regardless of which side of the baseline they sit.
        const dy = py > height - padB - 16 ? -8 : py < padT + 14 ? 14 : py > baseline ? 14 : -8
        return (
          <g key={`kp-${i}`}>
            <circle cx={px} cy={py} r={3} fill="#ff2222" stroke="#0a0a0a" strokeWidth={1} />
            <Label x={px} y={py + dy} anchor={anchor} fontSize={10} fontWeight={600} fill="#ff6666">
              {valueLabel} = {fmt(kp.value, decimals)} {unit}
            </Label>
          </g>
        )
      })}

      {/* Hover crosshair + tooltip */}
      {hover && (
        <g>
          <line x1={xScale(hover.x)} x2={xScale(hover.x)} y1={padT} y2={height - padB} stroke="#888" strokeWidth={1} strokeDasharray="3,3" />
          <circle cx={xScale(hover.x)} cy={yScale(hover.value)} r={3.5} fill={color} stroke="#0a0a0a" strokeWidth={1.5} />
          <g transform={`translate(${tooltipX}, ${padT + 4})`}>
            <rect x={0} y={0} width={122} height={36} rx={4} fill="#0a0a0a" stroke="#333" strokeWidth={1} />
            <text x={8} y={15} fill="#999" fontSize={10} fontFamily="monospace">
              x = {fmt(hover.x, 2)} {lengthUnit}
            </text>
            <text x={8} y={29} fill="#f0f0f0" fontSize={10} fontFamily="monospace" fontWeight={600}>
              {valueLabel} = {fmt(hover.value, decimals)} {unit}
            </text>
          </g>
        </g>
      )}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Beam sketch: span, supports, applied loads, applied moments and reactions,
// drawn to scale, with an axis and a span dimension below.
// ---------------------------------------------------------------------------
function Hatching({ x, y, side }: { x: number; y: number; side: 'left' | 'right' }) {
  const dir = side === 'left' ? -1 : 1
  const lines = []
  for (let i = -2; i <= 2; i++) {
    const y0 = y + i * 8
    lines.push(<line key={i} x1={x} y1={y0} x2={x + dir * 9} y2={y0 + 8} stroke="#555" strokeWidth={1.5} />)
  }
  return <g>{lines}</g>
}

function PinGlyph({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <polygon points={`${x - 10},${y + 16} ${x + 10},${y + 16} ${x},${y}`} fill="none" stroke={RED} strokeWidth={1.5} />
      <line x1={x - 15} x2={x + 15} y1={y + 16} y2={y + 16} stroke={RED} strokeWidth={1.5} />
      <Hatching x={x - 15} y={y + 22} side="left" />
      <Hatching x={x - 6} y={y + 22} side="left" />
      <Hatching x={x + 3} y={y + 22} side="left" />
      <Hatching x={x + 12} y={y + 22} side="left" />
    </g>
  )
}

function RollerGlyph({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <polygon points={`${x - 10},${y + 14} ${x + 10},${y + 14} ${x},${y}`} fill="none" stroke={RED} strokeWidth={1.5} />
      <circle cx={x - 5} cy={y + 19} r={3} fill="none" stroke={RED} strokeWidth={1.5} />
      <circle cx={x + 5} cy={y + 19} r={3} fill="none" stroke={RED} strokeWidth={1.5} />
      <line x1={x - 15} x2={x + 15} y1={y + 23} y2={y + 23} stroke={RED} strokeWidth={1.5} />
      <Hatching x={x - 15} y={y + 29} side="left" />
      <Hatching x={x - 6} y={y + 29} side="left" />
      <Hatching x={x + 3} y={y + 29} side="left" />
      <Hatching x={x + 12} y={y + 29} side="left" />
    </g>
  )
}

function FixedGlyph({ x, y, side }: { x: number; y: number; side: 'left' | 'right' }) {
  const dir = side === 'left' ? -1 : 1
  return (
    <g>
      <line x1={x} y1={y - 22} x2={x} y2={y + 22} stroke={RED} strokeWidth={2.5} />
      {[-2, -1, 0, 1].map((i) => (
        <line
          key={i}
          x1={x}
          y1={y - 22 + (i + 1) * 11}
          x2={x + dir * 9}
          y2={y - 22 + (i + 1) * 11 + 11}
          stroke="#555"
          strokeWidth={1.5}
        />
      ))}
    </g>
  )
}

export function BeamDiagram({
  type,
  leftKind: leftKindProp,
  rightKind: rightKindProp,
  supports: supportsProp,
  length,
  pointLoads,
  udls,
  trapezoidalLoads,
  momentLoads,
  reactions,
  lengthUnit,
  forceUnit,
  udlUnit,
  momentUnit,
  fmt,
  layers = DEFAULT_BEAM_LAYERS,
}: {
  type: BeamType
  leftKind?: 'pin' | 'roller' | 'fixed' | 'free'
  rightKind?: 'pin' | 'roller' | 'fixed' | 'free'
  supports?: SupportMarker[]
  length: number
  pointLoads: PointLoad[]
  udls: UDLLoad[]
  trapezoidalLoads: TrapezoidalLoad[]
  momentLoads: MomentLoad[]
  reactions: Reactions
  lengthUnit: string
  forceUnit: string
  udlUnit: string
  momentUnit: string
  fmt: (v: number, d?: number) => string
  layers?: BeamLayerOptions
}) {
  const width = 700
  const height = 460
  const padX = 70
  const beamY = 230
  const left = padX
  const right = width - padX
  const safeLength = Math.max(length, 1e-9)
  const xScale = (xi: number) => left + (xi / safeLength) * (right - left)
  const showLabels = layers.labels

  const leftKind = leftKindProp ?? (type === 'simply-supported' ? 'pin' : 'fixed')
  const rightKind = rightKindProp ?? (
    type === 'simply-supported' ? 'roller'
      : type === 'fixed-fixed' ? 'fixed'
      : type === 'propped-cantilever' ? 'pin'
      : 'free'
  )

  // Global magnitudes, used to size arrows proportionally within each load category.
  const maxDistMag = Math.max(
    1e-9,
    ...udls.map((u) => Math.abs(u.magnitude)),
    ...trapezoidalLoads.flatMap((t) => [Math.abs(t.startMag), Math.abs(t.endMag)])
  )
  const maxPointMag = Math.max(1e-9, ...pointLoads.map((p) => Math.abs(p.magnitude)))
  const maxReactionMag = Math.max(1e-9, Math.abs(reactions.RA), Math.abs(reactions.RB))

  // Labels are collected while drawing each load category, then rendered as a
  // final pass on top of every arrow/bracket so text never gets cut by a line.
  const labelEls: React.ReactNode[] = []

  function anchorFor(px: number): 'start' | 'middle' | 'end' {
    if (px < left + 60) return 'start'
    if (px > right - 60) return 'end'
    return 'middle'
  }

  // Distributed-load rendering: returns the list of arrow endpoints + a
  // top-edge polyline, given a function returning the (signed) intensity at
  // a fraction 0..1 along [start, end].
  function distributedArrows(
    id: string,
    start: number,
    end: number,
    wAt: (frac: number) => number,
    maxArm: number
  ) {
    const xs = xScale(clamp(start, 0, length))
    const xe = xScale(clamp(end, 0, length))
    const maxMag = Math.max(Math.abs(wAt(0)), Math.abs(wAt(1)), 1e-9)
    const count = Math.max(2, Math.min(14, Math.round((xe - xs) / 26)))
    const arrows = []
    const topPts: string[] = []
    for (let i = 0; i <= count; i++) {
      const frac = count > 0 ? i / count : 0
      const ax = xs + (xe - xs) * frac
      const w = wAt(frac)
      const positive = w >= 0
      const arm = Math.max(6, (Math.abs(w) / maxMag) * maxArm)
      const y1 = positive ? beamY - arm : beamY + arm
      const marker = positive ? 'url(#arrow-down)' : 'url(#arrow-up)'
      arrows.push(<line key={`${id}-a${i}`} x1={ax} y1={y1} x2={ax} y2={beamY} stroke={RED_LIGHT} strokeWidth={1.5} markerEnd={marker} />)
      topPts.push(`${ax.toFixed(2)},${y1.toFixed(2)}`)
    }
    return { xs, xe, arrows, topPts }
  }

  // UDLs
  const udlEls = layers.udl
    ? udls.map((u) => {
        const maxArm = 35 + (Math.abs(u.magnitude) / maxDistMag) * 30
        const { xs, xe, arrows } = distributedArrows(u.id, u.start, u.end, () => u.magnitude, maxArm)
        const positive = u.magnitude >= 0
        const topY = positive ? beamY - maxArm : beamY + maxArm
        const tickDir = positive ? 1 : -1
        const labelY = positive ? topY - 8 : topY + 16
        if (showLabels) {
          labelEls.push(
            <Label key={`lbl-${u.id}`} x={(xs + xe) / 2} y={labelY} anchor="middle" fontWeight={600} fill={RED_LIGHT}>
              {u.label} ({u.loadType}): {fmt(u.magnitude, 2)} {udlUnit}
            </Label>
          )
        }
        return (
          <g key={u.id}>
            <line x1={xs} x2={xe} y1={topY} y2={topY} stroke={RED_LIGHT} strokeWidth={1.5} />
            <line x1={xs} x2={xs} y1={topY} y2={topY + 6 * tickDir} stroke={RED_LIGHT} strokeWidth={1.5} />
            <line x1={xe} x2={xe} y1={topY} y2={topY + 6 * tickDir} stroke={RED_LIGHT} strokeWidth={1.5} />
            {arrows}
          </g>
        )
      })
    : null

  // Trapezoidal loads
  const trapEls = layers.trapezoidal
    ? trapezoidalLoads.map((t) => {
        const maxArm = 35 + (Math.max(Math.abs(t.startMag), Math.abs(t.endMag)) / maxDistMag) * 30
        const { xs, xe, arrows, topPts } = distributedArrows(
          t.id,
          t.start,
          t.end,
          (frac) => t.startMag + (t.endMag - t.startMag) * frac,
          maxArm
        )
        const avg = t.startMag + t.endMag
        const positive = avg >= 0
        const denom = Math.max(Math.abs(t.startMag), Math.abs(t.endMag), 1e-9)
        const startArm = Math.max(6, (Math.abs(t.startMag) / denom) * maxArm)
        const endArm = Math.max(6, (Math.abs(t.endMag) / denom) * maxArm)
        const startY = t.startMag >= 0 ? beamY - startArm : beamY + startArm
        const endY = t.endMag >= 0 ? beamY - endArm : beamY + endArm
        const centerLabelY = positive ? beamY - maxArm - 10 : beamY + maxArm + 18
        if (showLabels) {
          labelEls.push(
            <Label key={`lbl-${t.id}-s`} x={xs} y={t.startMag >= 0 ? startY - 8 : startY + 16} anchor="start" fontSize={10} fill={RED_LIGHT}>
              w_start = {fmt(t.startMag, 2)} {udlUnit}
            </Label>,
            <Label key={`lbl-${t.id}-e`} x={xe} y={t.endMag >= 0 ? endY - 8 : endY + 16} anchor="end" fontSize={10} fill={RED_LIGHT}>
              w_end = {fmt(t.endMag, 2)} {udlUnit}
            </Label>,
            <Label key={`lbl-${t.id}-c`} x={(xs + xe) / 2} y={centerLabelY} anchor="middle" fontWeight={600} fill={RED_LIGHT}>
              {t.label} ({t.loadType})
            </Label>
          )
        }
        return (
          <g key={t.id}>
            <polyline points={topPts.join(' ')} fill="none" stroke={RED_LIGHT} strokeWidth={1.5} />
            {arrows}
          </g>
        )
      })
    : null

  // Point loads
  const pointEls = layers.pointLoads
    ? pointLoads.map((p) => {
        const px = xScale(clamp(p.position, 0, length))
        const positive = p.magnitude >= 0
        const arm = 55 + (Math.abs(p.magnitude) / maxPointMag) * 60
        const y1 = positive ? beamY - arm : beamY + arm
        const marker = positive ? 'url(#arrow-down)' : 'url(#arrow-up)'
        const labelY = positive ? y1 - 8 : y1 + 16
        if (showLabels) {
          labelEls.push(
            <Label key={`lbl-${p.id}`} x={px} y={labelY} anchor={anchorFor(px)} fontWeight={600} fill={RED_LIGHT}>
              {p.label} ({p.loadType}): {fmt(p.magnitude, 2)} {forceUnit}
            </Label>
          )
        }
        return <line key={p.id} x1={px} y1={y1} x2={px} y2={beamY} stroke={RED_LIGHT} strokeWidth={2.5} markerEnd={marker} />
      })
    : null

  // Applied moment loads - drawn as a curved arrow above the beam
  const momentEls = layers.moments
    ? momentLoads.map((m) => {
        const mx = xScale(clamp(m.position, 0, length))
        const r = 18
        const cy = beamY - 38
        const ccw = m.direction === 'CCW'
        const path = ccw
          ? `M ${(mx + r).toFixed(2)} ${cy} A ${r} ${r} 0 1 0 ${(mx - r * 0.85).toFixed(2)} ${(cy - r * 0.53).toFixed(2)}`
          : `M ${(mx - r).toFixed(2)} ${cy} A ${r} ${r} 0 1 1 ${(mx + r * 0.85).toFixed(2)} ${(cy - r * 0.53).toFixed(2)}`
        if (showLabels) {
          labelEls.push(
            <Label key={`lbl-${m.id}`} x={mx} y={cy - r - 8} anchor={anchorFor(mx)} fontWeight={600} fill={RED_LIGHT}>
              {m.label}: {fmt(m.magnitude, 2)} {momentUnit} {ccw ? '↺' : '↻'}
            </Label>
          )
        }
        return (
          <g key={m.id}>
            <line x1={mx} y1={cy + r} x2={mx} y2={beamY} stroke="#444" strokeWidth={1} strokeDasharray="2,2" />
            <path d={path} fill="none" stroke={RED_LIGHT} strokeWidth={2.5} markerEnd="url(#arrow-tip)" />
          </g>
        )
      })
    : null

  // Reaction arrows
  const reactionEls = layers.reactions
    ? (() => {
        const arms: { x: number; R: number; name: string }[] = [{ x: left, R: reactions.RA, name: 'RA' }]
        if (type !== 'cantilever') arms.push({ x: right, R: reactions.RB, name: 'RB' })
        return arms.map(({ x: rx, R, name }) => {
          if (Math.abs(R) < 1e-9) return null
          const positive = R >= 0
          const arm = 24 + (Math.abs(R) / maxReactionMag) * 36
          const y2 = positive ? beamY - arm : beamY + arm
          const marker = positive ? 'url(#arrow-up-gray)' : 'url(#arrow-down-gray)'
          const labelY = positive ? y2 - 8 : y2 + 16
          if (showLabels) {
            labelEls.push(
              <Label key={`lbl-${name}`} x={rx} y={labelY} anchor="middle" fontWeight={600} fill={GRAY}>
                {name} = {fmt(R, 2)} {forceUnit}
              </Label>
            )
          }
          return <line key={name} x1={rx} y1={beamY} x2={rx} y2={y2} stroke={GRAY} strokeWidth={2.5} markerEnd={marker} />
        })
      })()
    : null

  // Reaction moments (cantilever / fixed-fixed)
  if (layers.reactions && showLabels && reactions.MA !== 0) {
    labelEls.push(
      <Label key="lbl-MA" x={left} y={beamY + 74} anchor="middle" fill={GRAY}>
        M_A = {fmt(reactions.MA, 2)} {momentUnit}
      </Label>
    )
  }
  if (layers.reactions && showLabels && reactions.MB !== 0) {
    labelEls.push(
      <Label key="lbl-MB" x={right} y={beamY + 74} anchor="middle" fill={GRAY}>
        M_B = {fmt(reactions.MB, 2)} {momentUnit}
      </Label>
    )
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <marker id="arrow-down" markerWidth="10" markerHeight="10" viewBox="0 0 10 10" refX="5" refY="9" markerUnits="userSpaceOnUse">
          <path d="M1,0 L9,0 L5,9 Z" fill={RED_LIGHT} />
        </marker>
        <marker id="arrow-up" markerWidth="10" markerHeight="10" viewBox="0 0 10 10" refX="5" refY="1" markerUnits="userSpaceOnUse">
          <path d="M1,10 L9,10 L5,1 Z" fill={RED_LIGHT} />
        </marker>
        <marker id="arrow-up-gray" markerWidth="10" markerHeight="10" viewBox="0 0 10 10" refX="5" refY="1" markerUnits="userSpaceOnUse">
          <path d="M1,10 L9,10 L5,1 Z" fill={GRAY} />
        </marker>
        <marker id="arrow-down-gray" markerWidth="10" markerHeight="10" viewBox="0 0 10 10" refX="5" refY="9" markerUnits="userSpaceOnUse">
          <path d="M1,0 L9,0 L5,9 Z" fill={GRAY} />
        </marker>
        <marker id="arrow-tip" markerWidth="8" markerHeight="8" viewBox="0 0 10 10" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M0,0 L10,5 L0,10 Z" fill={RED_LIGHT} />
        </marker>
      </defs>

      {/* Beam depth hint (cross-section icon) */}
      {layers.dimensions && (
        <g>
          <rect x={20} y={beamY - 18} width={26} height={36} fill="none" stroke="#666" strokeWidth={1.5} />
          <line x1={20} y1={beamY} x2={46} y2={beamY} stroke="#666" strokeWidth={1} strokeDasharray="2,2" />
          <text x={33} y={beamY + 32} textAnchor="middle" fill="#555" fontSize={8} fontFamily="monospace">
            section
          </text>
        </g>
      )}

      {/* Beam */}
      <line x1={left} x2={right} y1={beamY} y2={beamY} stroke="#f0f0f0" strokeWidth={4} strokeLinecap="round" />

      {/* Supports */}
      {supportsProp ? supportsProp.map((s, i) => {
        const sx = xScale(clamp(s.position, 0, length))
        const side = sx <= (left + right) / 2 ? 'left' : 'right'
        return (
          <g key={`sup-${i}`}>
            {s.kind === 'pin' && <PinGlyph x={sx} y={beamY} />}
            {s.kind === 'roller' && <RollerGlyph x={sx} y={beamY} />}
            {s.kind === 'fixed' && <FixedGlyph x={sx} y={beamY} side={side} />}
          </g>
        )
      }) : (
        <>
          {leftKind === 'pin' && <PinGlyph x={left} y={beamY} />}
          {leftKind === 'roller' && <RollerGlyph x={left} y={beamY} />}
          {leftKind === 'fixed' && <FixedGlyph x={left} y={beamY} side="left" />}
          {rightKind === 'pin' && <PinGlyph x={right} y={beamY} />}
          {rightKind === 'roller' && <RollerGlyph x={right} y={beamY} />}
          {rightKind === 'fixed' && <FixedGlyph x={right} y={beamY} side="right" />}
        </>
      )}

      {udlEls}
      {trapEls}
      {pointEls}
      {momentEls}
      {reactionEls}

      {/* Labels - drawn last so they stay on top of every arrow/bracket above. */}
      {showLabels && <g>{labelEls}</g>}

      {/* X-axis with position ticks */}
      {layers.dimensions && (
        <g>
          <line x1={left} x2={right} y1={beamY + 110} y2={beamY + 110} stroke="#333" strokeWidth={1} />
          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const xv = f * length
            const px = xScale(xv)
            const axisY = beamY + 110
            return (
              <g key={f}>
                <line x1={px} x2={px} y1={axisY - 4} y2={axisY + 4} stroke="#444" strokeWidth={1} />
                <text x={px} y={axisY + 16} textAnchor="middle" fill="#666" fontSize={10} fontFamily="monospace">
                  {fmt(xv, 2)}
                  {f === 1 ? ` ${lengthUnit}` : ''}
                </text>
              </g>
            )
          })}
        </g>
      )}

      {/* Span dimension */}
      {layers.dimensions && (
        <g>
          <line x1={left} x2={right} y1={beamY + 146} y2={beamY + 146} stroke="#444" strokeWidth={1} />
          <line x1={left} x2={left} y1={beamY + 140} y2={beamY + 152} stroke="#444" strokeWidth={1} />
          <line x1={right} x2={right} y1={beamY + 140} y2={beamY + 152} stroke="#444" strokeWidth={1} />
          <text x={(left + right) / 2} y={beamY + 166} textAnchor="middle" fill="#666" fontSize={11} fontFamily="monospace">
            L = {fmt(length, 2)} {lengthUnit}
          </text>
        </g>
      )}
    </svg>
  )
}
