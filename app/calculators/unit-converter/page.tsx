'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Navbar from '../../components/Navbar'

interface UnitDef { symbol: string; name: string; toBase: number }
interface CategoryDef {
  id: string; label: string; icon: string; units: UnitDef[]
  convert?: (v: number, from: string, to: string) => number
}
interface HistoryEntry { id: number; catId: string; value: number; fromSym: string; toSym: string; result: number }

let _hid = 0

const CATEGORIES: CategoryDef[] = [
  { id: 'length', label: 'Length', icon: '\u{1F4CF}', units: [
    { symbol: 'nm', name: 'Nanometer', toBase: 1e-9 },
    { symbol: 'µm', name: 'Micrometer', toBase: 1e-6 },
    { symbol: 'mm', name: 'Millimeter', toBase: 0.001 },
    { symbol: 'cm', name: 'Centimeter', toBase: 0.01 },
    { symbol: 'dm', name: 'Decimeter', toBase: 0.1 },
    { symbol: 'm', name: 'Meter', toBase: 1 },
    { symbol: 'km', name: 'Kilometer', toBase: 1000 },
    { symbol: 'in', name: 'Inch', toBase: 0.0254 },
    { symbol: 'ft', name: 'Foot', toBase: 0.3048 },
    { symbol: 'yd', name: 'Yard', toBase: 0.9144 },
    { symbol: 'mi', name: 'Mile', toBase: 1609.344 },
    { symbol: 'nmi', name: 'Nautical mile', toBase: 1852 },
  ]},
  { id: 'area', label: 'Area', icon: '\u{1F4D0}', units: [
    { symbol: 'mm²', name: 'Square millimeter', toBase: 1e-6 },
    { symbol: 'cm²', name: 'Square centimeter', toBase: 1e-4 },
    { symbol: 'm²', name: 'Square meter', toBase: 1 },
    { symbol: 'km²', name: 'Square kilometer', toBase: 1e6 },
    { symbol: 'in²', name: 'Square inch', toBase: 6.4516e-4 },
    { symbol: 'ft²', name: 'Square foot', toBase: 0.09290304 },
    { symbol: 'acre', name: 'Acre', toBase: 4046.8564224 },
    { symbol: 'hectare', name: 'Hectare', toBase: 10000 },
  ]},
  { id: 'volume', label: 'Volume', icon: '\u{1F4E6}', units: [
    { symbol: 'mm³', name: 'Cubic millimeter', toBase: 1e-9 },
    { symbol: 'cm³', name: 'Cubic centimeter', toBase: 1e-6 },
    { symbol: 'm³', name: 'Cubic meter', toBase: 1 },
    { symbol: 'L', name: 'Liter', toBase: 0.001 },
    { symbol: 'mL', name: 'Milliliter', toBase: 1e-6 },
    { symbol: 'in³', name: 'Cubic inch', toBase: 1.6387064e-5 },
    { symbol: 'ft³', name: 'Cubic foot', toBase: 0.028316846592 },
    { symbol: 'gal (US)', name: 'Gallon (US)', toBase: 0.003785411784 },
    { symbol: 'gal (UK)', name: 'Gallon (UK)', toBase: 0.00454609 },
  ]},
  { id: 'mass', label: 'Mass', icon: '⚖️', units: [
    { symbol: 'mg', name: 'Milligram', toBase: 1e-6 },
    { symbol: 'g', name: 'Gram', toBase: 0.001 },
    { symbol: 'kg', name: 'Kilogram', toBase: 1 },
    { symbol: 'tonne', name: 'Tonne', toBase: 1000 },
    { symbol: 'lb', name: 'Pound', toBase: 0.45359237 },
    { symbol: 'oz', name: 'Ounce', toBase: 0.028349523125 },
    { symbol: 'kip-mass', name: 'Kip (mass)', toBase: 453.59237 },
    { symbol: 'ton (US)', name: 'Short ton', toBase: 907.18474 },
    { symbol: 'ton (UK)', name: 'Long ton', toBase: 1016.0469088 },
    { symbol: 'grain', name: 'Grain', toBase: 6.479891e-5 },
  ]},
  { id: 'force', label: 'Force', icon: '\u{1F4AA}', units: [
    { symbol: 'N', name: 'Newton', toBase: 1 },
    { symbol: 'kN', name: 'Kilonewton', toBase: 1e3 },
    { symbol: 'MN', name: 'Meganewton', toBase: 1e6 },
    { symbol: 'GN', name: 'Giganewton', toBase: 1e9 },
    { symbol: 'kgf', name: 'Kilogram-force', toBase: 9.80665 },
    { symbol: 'tf', name: 'Tonne-force', toBase: 9806.65 },
    { symbol: 'lbf', name: 'Pound-force', toBase: 4.4482216152605 },
    { symbol: 'kip', name: 'Kip', toBase: 4448.2216152605 },
  ]},
  { id: 'pressure', label: 'Pressure/Stress', icon: '\u{1F529}', units: [
    { symbol: 'Pa', name: 'Pascal', toBase: 1 },
    { symbol: 'kPa', name: 'Kilopascal', toBase: 1e3 },
    { symbol: 'MPa', name: 'Megapascal', toBase: 1e6 },
    { symbol: 'GPa', name: 'Gigapascal', toBase: 1e9 },
    { symbol: 'N/m²', name: 'Newton per sq meter', toBase: 1 },
    { symbol: 'kN/m²', name: 'Kilonewton per sq meter', toBase: 1e3 },
    { symbol: 'N/mm²', name: 'Newton per sq mm', toBase: 1e6 },
    { symbol: 'psi', name: 'Pound per sq inch', toBase: 6894.757293168 },
    { symbol: 'ksi', name: 'Kip per sq inch', toBase: 6894757.293168 },
    { symbol: 'kgf/cm²', name: 'Kilogram-force per sq cm', toBase: 98066.5 },
    { symbol: 'bar', name: 'Bar', toBase: 1e5 },
    { symbol: 'mbar', name: 'Millibar', toBase: 100 },
    { symbol: 'atm', name: 'Atmosphere', toBase: 101325 },
    { symbol: 'mmHg', name: 'Millimeter of mercury', toBase: 133.322387415 },
  ]},
  { id: 'moment', label: 'Moment/Torque', icon: '\u{1F504}', units: [
    { symbol: 'N·mm', name: 'Newton-millimeter', toBase: 0.001 },
    { symbol: 'N·m', name: 'Newton-meter', toBase: 1 },
    { symbol: 'kN·mm', name: 'Kilonewton-millimeter', toBase: 1 },
    { symbol: 'kN·m', name: 'Kilonewton-meter', toBase: 1e3 },
    { symbol: 'MN·m', name: 'Meganewton-meter', toBase: 1e6 },
    { symbol: 'lbf·in', name: 'Pound-force inch', toBase: 0.11298483 },
    { symbol: 'lbf·ft', name: 'Pound-force foot', toBase: 1.3558179483314 },
    { symbol: 'kip·in', name: 'Kip-inch', toBase: 112.98483 },
    { symbol: 'kip·ft', name: 'Kip-foot', toBase: 1355.8179483314 },
  ]},
  { id: 'dist-load', label: 'Distributed Load', icon: '\u{1F4CA}', units: [
    { symbol: 'N/m', name: 'Newton per meter', toBase: 1 },
    { symbol: 'N/mm', name: 'Newton per millimeter', toBase: 1e3 },
    { symbol: 'kN/m', name: 'Kilonewton per meter', toBase: 1e3 },
    { symbol: 'MN/m', name: 'Meganewton per meter', toBase: 1e6 },
    { symbol: 'lbf/ft', name: 'Pound-force per foot', toBase: 14.593903 },
    { symbol: 'lbf/in', name: 'Pound-force per inch', toBase: 175.12684 },
    { symbol: 'kip/ft', name: 'Kip per foot', toBase: 14593.903 },
    { symbol: 'kip/in', name: 'Kip per inch', toBase: 175126.84 },
  ]},
  { id: 'temperature', label: 'Temperature', icon: '\u{1F321}️', units: [
    { symbol: '°C', name: 'Celsius', toBase: 1 },
    { symbol: '°F', name: 'Fahrenheit', toBase: 1 },
    { symbol: 'K', name: 'Kelvin', toBase: 1 },
  ], convert: (v, from, to) => {
    let c: number
    if (from === '°C') c = v
    else if (from === '°F') c = (v - 32) * 5 / 9
    else c = v - 273.15
    if (to === '°C') return c
    if (to === '°F') return c * 9 / 5 + 32
    return c + 273.15
  }},
  { id: 'energy', label: 'Energy', icon: '⚡', units: [
    { symbol: 'J', name: 'Joule', toBase: 1 },
    { symbol: 'kJ', name: 'Kilojoule', toBase: 1e3 },
    { symbol: 'MJ', name: 'Megajoule', toBase: 1e6 },
    { symbol: 'cal', name: 'Calorie', toBase: 4.184 },
    { symbol: 'kcal', name: 'Kilocalorie', toBase: 4184 },
    { symbol: 'BTU', name: 'British thermal unit', toBase: 1055.05585262 },
    { symbol: 'kWh', name: 'Kilowatt-hour', toBase: 3.6e6 },
  ]},
  { id: 'power', label: 'Power', icon: '\u{1F50B}', units: [
    { symbol: 'W', name: 'Watt', toBase: 1 },
    { symbol: 'kW', name: 'Kilowatt', toBase: 1e3 },
    { symbol: 'MW', name: 'Megawatt', toBase: 1e6 },
    { symbol: 'hp', name: 'Horsepower', toBase: 745.69987158227 },
    { symbol: 'BTU/hr', name: 'BTU per hour', toBase: 0.29307107017 },
  ]},
  { id: 'speed', label: 'Speed', icon: '\u{1F4A8}', units: [
    { symbol: 'm/s', name: 'Meters per second', toBase: 1 },
    { symbol: 'km/h', name: 'Kilometers per hour', toBase: 1 / 3.6 },
    { symbol: 'mph', name: 'Miles per hour', toBase: 0.44704 },
    { symbol: 'ft/s', name: 'Feet per second', toBase: 0.3048 },
    { symbol: 'knot', name: 'Knot', toBase: 0.514444 },
  ]},
  { id: 'angle', label: 'Angle', icon: '\u{1F4D0}', units: [
    { symbol: 'deg', name: 'Degree', toBase: Math.PI / 180 },
    { symbol: 'rad', name: 'Radian', toBase: 1 },
    { symbol: 'grad', name: 'Gradian', toBase: Math.PI / 200 },
  ]},
  { id: 'time', label: 'Time', icon: '⏱️', units: [
    { symbol: 'ms', name: 'Millisecond', toBase: 0.001 },
    { symbol: 's', name: 'Second', toBase: 1 },
    { symbol: 'min', name: 'Minute', toBase: 60 },
    { symbol: 'hr', name: 'Hour', toBase: 3600 },
    { symbol: 'day', name: 'Day', toBase: 86400 },
  ]},
  { id: 'density', label: 'Density', icon: '\u{1F9F1}', units: [
    { symbol: 'kg/m³', name: 'Kilogram per cubic meter', toBase: 1 },
    { symbol: 'g/cm³', name: 'Gram per cubic centimeter', toBase: 1000 },
    { symbol: 'lb/ft³', name: 'Pound per cubic foot', toBase: 16.018463 },
    { symbol: 'lb/in³', name: 'Pound per cubic inch', toBase: 27679.905 },
  ]},
  { id: 'inertia', label: 'Moment of Inertia', icon: '\u{1F4C8}', units: [
    { symbol: 'mm⁴', name: 'mm to the fourth', toBase: 1e-12 },
    { symbol: 'cm⁴', name: 'cm to the fourth', toBase: 1e-8 },
    { symbol: 'm⁴', name: 'm to the fourth', toBase: 1 },
    { symbol: 'in⁴', name: 'in to the fourth', toBase: 4.16231426e-7 },
    { symbol: 'ft⁴', name: 'ft to the fourth', toBase: 8.63097484e-3 },
  ]},
  { id: 'section-mod', label: 'Section Modulus', icon: '\u{1F4C9}', units: [
    { symbol: 'mm³', name: 'Cubic millimeter', toBase: 1e-9 },
    { symbol: 'cm³', name: 'Cubic centimeter', toBase: 1e-6 },
    { symbol: 'm³', name: 'Cubic meter', toBase: 1 },
    { symbol: 'in³', name: 'Cubic inch', toBase: 1.6387064e-5 },
    { symbol: 'ft³', name: 'Cubic foot', toBase: 0.028316846592 },
  ]},
]

function cv(cat: CategoryDef, value: number, from: string, to: string): number {
  if (cat.convert) return cat.convert(value, from, to)
  const fu = cat.units.find(u => u.symbol === from)
  const tu = cat.units.find(u => u.symbol === to)
  if (!fu || !tu || tu.toBase === 0) return 0
  return (value * fu.toBase) / tu.toBase
}

function fmt(n: number): string {
  if (n === 0) return '0'
  const a = Math.abs(n)
  if (a >= 1e15 || (a > 0 && a < 1e-12)) return n.toExponential(6)
  if (a < 0.001) return n.toExponential(6)
  if (a >= 1e9) return n.toExponential(6)
  if (a >= 1) return parseFloat(n.toPrecision(10)).toString()
  return parseFloat(n.toPrecision(8)).toString()
}

function findUnit(q: string): { catIdx: number; sym: string } | null {
  const ql = q.toLowerCase().trim()
  if (!ql) return null
  for (let ci = 0; ci < CATEGORIES.length; ci++) {
    for (const u of CATEGORIES[ci].units) {
      if (u.symbol.toLowerCase() === ql || u.name.toLowerCase() === ql) return { catIdx: ci, sym: u.symbol }
    }
  }
  for (let ci = 0; ci < CATEGORIES.length; ci++) {
    for (const u of CATEGORIES[ci].units) {
      if (u.symbol.toLowerCase().includes(ql) || u.name.toLowerCase().includes(ql)) return { catIdx: ci, sym: u.symbol }
    }
  }
  return null
}

export default function UnitConverterPage() {
  const [catIdx, setCatIdx] = useState(0)
  const [fromSym, setFromSym] = useState('mm')
  const [toSym, setToSym] = useState('m')
  const [inputStr, setInputStr] = useState('1')
  const [picker, setPicker] = useState<'from' | 'to' | null>(null)
  const [pickerCat, setPickerCat] = useState(0)
  const [pickerSearch, setPickerSearch] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [nlQuery, setNlQuery] = useState('')
  const [nlResult, setNlResult] = useState<{ text: string; error?: boolean } | null>(null)
  const [helpForce, setHelpForce] = useState('10')
  const [helpForceUnit, setHelpForceUnit] = useState('kN')
  const [helpLength, setHelpLength] = useState('5')
  const [helpArea, setHelpArea] = useState('2')
  const copyRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const cat = CATEGORIES[catIdx]
  const val = parseFloat(inputStr) || 0
  const result = cv(cat, val, fromSym, toSym)

  function selectCategory(idx: number) {
    setCatIdx(idx)
    setFromSym(CATEGORIES[idx].units[0].symbol)
    setToSym(CATEGORIES[idx].units[Math.min(1, CATEGORIES[idx].units.length - 1)].symbol)
  }

  function handleSwap() {
    const f = fromSym
    setFromSym(toSym)
    setToSym(f)
  }

  function openPicker(side: 'from' | 'to') {
    setPicker(side)
    setPickerCat(catIdx)
    setPickerSearch('')
    setTimeout(() => searchInputRef.current?.focus(), 50)
  }

  function pickUnit(sym: string, ci: number) {
    if (ci !== catIdx) {
      setCatIdx(ci)
      if (picker === 'from') {
        setFromSym(sym)
        setToSym(CATEGORIES[ci].units.find(u => u.symbol !== sym)?.symbol ?? sym)
      } else {
        setToSym(sym)
        setFromSym(CATEGORIES[ci].units.find(u => u.symbol !== sym)?.symbol ?? sym)
      }
    } else {
      if (picker === 'from') setFromSym(sym)
      else setToSym(sym)
    }
    setPicker(null)
  }

  function doCopy(text: string, key: string) {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(key)
    if (copyRef.current) clearTimeout(copyRef.current)
    copyRef.current = setTimeout(() => setCopied(null), 1500)
  }

  function addHistory() {
    if (val === 0 || fromSym === toSym) return
    _hid++
    setHistory(prev => [
      { id: _hid, catId: cat.id, value: val, fromSym, toSym, result },
      ...prev.filter(h => !(h.catId === cat.id && h.fromSym === fromSym && h.toSym === toSym)),
    ].slice(0, 10))
  }

  useEffect(() => {
    if (val === 0 || fromSym === toSym) return
    const t = setTimeout(addHistory, 600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [val, fromSym, toSym, catIdx])

  function runNl() {
    const q = nlQuery.trim()
    if (!q) { setNlResult(null); return }
    const m = q.match(/^([+-]?[\d.eE+-]+)\s+(.+?)\s+(?:in|to|as|->|=)\s+(.+)$/i)
    if (!m) { setNlResult({ text: 'Format: "10 kN in lbf" or "5 ft to m"', error: true }); return }
    const v = parseFloat(m[1])
    if (isNaN(v)) { setNlResult({ text: 'Invalid number', error: true }); return }
    const fu = findUnit(m[2])
    const tu = findUnit(m[3])
    if (!fu) { setNlResult({ text: `Unknown unit: ${m[2]}`, error: true }); return }
    if (!tu) { setNlResult({ text: `Unknown unit: ${m[3]}`, error: true }); return }
    if (fu.catIdx !== tu.catIdx) { setNlResult({ text: `Cannot convert ${CATEGORIES[fu.catIdx].label} to ${CATEGORIES[tu.catIdx].label}`, error: true }); return }
    const r = cv(CATEGORIES[fu.catIdx], v, fu.sym, tu.sym)
    setNlResult({ text: `${fmt(v)} ${fu.sym} = ${fmt(r)} ${tu.sym}` })
  }

  const allConv = cat.units.map(u => ({ sym: u.symbol, name: u.name, value: cv(cat, val, fromSym, u.symbol) }))

  const pickerCategory = CATEGORIES[pickerCat]
  const pickerFilteredUnits = useMemo(() => {
    if (!pickerSearch.trim()) return pickerCategory.units
    const q = pickerSearch.toLowerCase()
    return pickerCategory.units.filter(u => u.symbol.toLowerCase().includes(q) || u.name.toLowerCase().includes(q))
  }, [pickerCategory, pickerSearch])

  const pickerFilteredCats = useMemo(() => {
    if (!pickerSearch.trim()) return CATEGORIES.map((_, i) => i)
    const q = pickerSearch.toLowerCase()
    return CATEGORIES.map((c, i) => ({ c, i }))
      .filter(({ c }) => c.label.toLowerCase().includes(q) || c.units.some(u => u.symbol.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)))
      .map(({ i }) => i)
  }, [pickerSearch])

  const forceCat = CATEGORIES.find(c => c.id === 'force')!
  const hfVal = parseFloat(helpForce) || 0
  const hlVal = parseFloat(helpLength) || 0
  const haVal = parseFloat(helpArea) || 0
  const hfNewtons = cv(forceCat, hfVal, helpForceUnit, 'N')

  return (
    <main style={{ background: '#0a0a0a', color: '#f0f0f0', fontFamily: "'Inter', sans-serif", minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap');
        *{box-sizing:border-box}

        .uc-hdr{padding:28px 48px 20px;border-bottom:1px solid #1a1a1a;max-width:1200px;margin:0 auto}
        .uc-back{color:#888;text-decoration:none;font-size:13px;font-weight:500}
        .uc-back:hover{color:#f0f0f0}
        .uc-tag{font-size:11px;font-weight:700;letter-spacing:0.14em;color:#cc0000;text-transform:uppercase;margin:14px 0 12px}
        .uc-h1{font-family:'Space Grotesk',sans-serif;font-size:clamp(28px,4vw,44px);font-weight:700;letter-spacing:-0.03em}
        .uc-sub{font-size:14px;color:#666;margin-top:8px;max-width:600px;line-height:1.6}

        .uc-body{max-width:900px;margin:0 auto;padding:28px 48px 80px}

        .uc-card{background:#111;border:1px solid #1e1e1e;border-radius:12px;padding:28px;margin-bottom:24px}
        .uc-card-title{font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:700;color:#f0f0f0;
          margin-bottom:18px;letter-spacing:0.01em;text-transform:uppercase}
        .uc-card-title .accent{color:#cc0000}

        .uc-input-row{display:flex;align-items:center;gap:12px;margin-bottom:18px}
        .uc-big-input{flex:1;background:#0a0a0a;border:1px solid #2a2a2a;border-radius:8px;color:#f0f0f0;
          padding:16px 18px;font-size:28px;font-family:'Geist Mono','SF Mono',monospace;font-weight:600;
          outline:none;transition:border-color 0.2s;width:100%;min-width:0}
        .uc-big-input:focus{border-color:#cc0000}

        .uc-unit-row{display:flex;align-items:center;gap:12px;margin-bottom:20px}
        .uc-unit-btn{flex:1;display:flex;align-items:center;gap:10px;background:#0c0c0c;border:1px solid #2a2a2a;
          border-radius:8px;padding:14px 16px;cursor:pointer;transition:all 0.15s;min-width:0}
        .uc-unit-btn:hover{border-color:#444;background:#111}
        .uc-unit-btn-sym{font-family:'Geist Mono','SF Mono',monospace;font-size:18px;font-weight:700;color:#f0f0f0;
          white-space:nowrap}
        .uc-unit-btn-name{font-size:12px;color:#777;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .uc-unit-btn-label{font-size:9px;color:#555;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;margin-bottom:2px}
        .uc-unit-btn-right{display:flex;flex-direction:column;min-width:0;flex:1}

        .uc-swap{width:44px;height:44px;border-radius:50%;background:#1a1a1a;border:1px solid #2a2a2a;
          color:#ccc;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;
          transition:all 0.2s;flex-shrink:0}
        .uc-swap:hover{background:rgba(204,0,0,0.12);border-color:#cc0000;color:#ff4444}

        .uc-result-box{background:#0a0a0a;border:1px solid #2a2a2a;border-radius:8px;padding:18px 20px;
          display:flex;align-items:center;justify-content:space-between;gap:12px}
        .uc-result-val{font-family:'Geist Mono','SF Mono',monospace;font-size:28px;font-weight:700;color:#ff4444;
          word-break:break-all;flex:1}
        .uc-result-unit{font-size:16px;color:#888;font-weight:600;white-space:nowrap}
        .uc-copy-sm{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:4px;color:#777;font-size:11px;
          padding:5px 10px;cursor:pointer;transition:all 0.15s;font-family:'Inter',sans-serif;white-space:nowrap;flex-shrink:0}
        .uc-copy-sm:hover{border-color:#cc0000;color:#ff4444}
        .uc-copy-sm.ok{border-color:#2ecc71;color:#2ecc71}

        /* Picker overlay */
        .pk-overlay{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.7);display:flex;
          align-items:center;justify-content:center;padding:20px}
        .pk-panel{background:#111;border:1px solid #1e1e1e;border-radius:16px;width:100%;max-width:700px;
          max-height:80vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.6)}
        .pk-top{display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid #1e1e1e}
        .pk-search{flex:1;background:#0a0a0a;border:1px solid #2a2a2a;border-radius:6px;color:#f0f0f0;
          padding:10px 14px;font-size:14px;font-family:'Inter',sans-serif;outline:none}
        .pk-search:focus{border-color:#cc0000}
        .pk-close{width:36px;height:36px;border-radius:6px;background:#1a1a1a;border:1px solid #2a2a2a;
          color:#888;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;
          transition:all 0.15s;flex-shrink:0}
        .pk-close:hover{border-color:#cc0000;color:#ff4444}

        .pk-body{display:flex;flex:1;overflow:hidden;min-height:0}
        .pk-cats{width:200px;border-right:1px solid #1e1e1e;overflow-y:auto;flex-shrink:0;padding:8px 0}
        .pk-cat-btn{display:flex;align-items:center;gap:8px;width:100%;padding:9px 16px;background:none;
          border:none;color:#888;font-family:'Inter',sans-serif;font-size:12px;font-weight:500;cursor:pointer;
          transition:all 0.12s;text-align:left;border-left:2px solid transparent}
        .pk-cat-btn:hover{color:#ccc;background:rgba(255,255,255,0.03)}
        .pk-cat-btn.active{color:#f0f0f0;background:rgba(204,0,0,0.08);border-left-color:#cc0000}
        .pk-cat-icon{font-size:15px;width:24px;text-align:center;flex-shrink:0}

        .pk-units{flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-wrap:wrap;gap:8px;align-content:flex-start}
        .pk-chip{display:flex;align-items:center;gap:8px;background:#0c0c0c;border:1px solid #2a2a2a;
          border-radius:8px;padding:10px 14px;cursor:pointer;transition:all 0.12s;min-width:0}
        .pk-chip:hover{border-color:#444;background:#151515}
        .pk-chip.selected{border-color:#cc0000;background:rgba(204,0,0,0.1)}
        .pk-chip-sym{font-family:'Geist Mono','SF Mono',monospace;font-size:14px;font-weight:700;color:#f0f0f0;
          white-space:nowrap}
        .pk-chip-name{font-size:11px;color:#777;white-space:nowrap}

        /* All conversions table */
        .uc-tbl{width:100%;border-collapse:collapse}
        .uc-tbl th{text-align:left;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;
          color:#555;padding:8px 12px;border-bottom:1px solid #1e1e1e}
        .uc-tbl td{padding:8px 12px;font-size:13px;border-bottom:1px solid #141414;color:#ccc}
        .uc-tbl tr:hover td{background:rgba(255,255,255,0.02)}
        .uc-tbl .hl td{background:rgba(204,0,0,0.06);color:#ff4444}
        .uc-tbl .sym{font-family:'Geist Mono','SF Mono',monospace;color:#888;font-size:12px}
        .uc-tbl .val{font-family:'Geist Mono','SF Mono',monospace;color:#f0f0f0;font-weight:600}

        /* Quick tools */
        .qt-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
        .qt-card{background:#0c0c0c;border:1px solid #1e1e1e;border-radius:10px;padding:20px}
        .qt-title{font-size:12px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px}
        .qt-input{background:#0a0a0a;border:1px solid #2a2a2a;border-radius:4px;color:#f0f0f0;padding:9px 10px;
          font-size:13px;font-family:'Inter',sans-serif;width:100%;outline:none}
        .qt-input:focus{border-color:#cc0000}
        .qt-select{background:#0a0a0a;border:1px solid #2a2a2a;border-radius:4px;color:#f0f0f0;padding:9px 10px;
          font-size:13px;font-family:'Inter',sans-serif;width:100%;outline:none}
        .qt-btn{background:#cc0000;border:none;color:#fff;padding:9px 18px;font-size:12px;font-weight:600;
          border-radius:4px;cursor:pointer;transition:background 0.2s;font-family:'Inter',sans-serif}
        .qt-btn:hover{background:#e60000}
        .qt-result{font-family:'Geist Mono','SF Mono',monospace;font-size:13px;margin-top:10px;padding:10px 12px;
          background:#0a0a0a;border:1px solid #1e1e1e;border-radius:6px}
        .qt-result.err{color:#ff4444}
        .qt-result.ok{color:#2ecc71}
        .qt-row{display:flex;gap:8px;margin-bottom:8px}

        /* History */
        .uc-hist-item{display:flex;align-items:center;gap:8px;padding:8px 12px;background:#0c0c0c;
          border:1px solid #1a1a1a;border-radius:6px;margin-bottom:6px;font-size:12px;color:#888;
          cursor:pointer;transition:all 0.15s}
        .uc-hist-item:hover{background:#111;border-color:#2a2a2a;color:#ccc}
        .uc-hist-cat{font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#555;min-width:70px}
        .uc-hist-val{font-family:'Geist Mono','SF Mono',monospace;color:#ccc}
        .uc-hist-arrow{color:#cc0000;font-weight:700}

        @media(max-width:900px){
          .uc-hdr,.uc-body{padding-left:20px;padding-right:20px}
          .qt-grid{grid-template-columns:1fr}
        }
        @media(max-width:600px){
          .uc-hdr,.uc-body{padding-left:16px;padding-right:16px}
          .uc-card{padding:20px 16px}
          .uc-big-input{font-size:22px;padding:14px}
          .uc-result-val{font-size:22px}
          .uc-unit-row{flex-direction:column;gap:8px}
          .uc-unit-btn{width:100%}
          .uc-swap{align-self:center;transform:rotate(90deg)}
          .uc-h1{font-size:clamp(22px,6vw,36px) !important}
          .pk-cats{width:140px}
          .pk-cat-btn{font-size:11px;padding:8px 10px}
          .pk-chip{padding:8px 10px}
          .pk-chip-sym{font-size:12px}
          .pk-chip-name{font-size:10px}
        }
      `}</style>

      <Navbar activePage="calculators" />

      {/* Header */}
      <div className="uc-hdr">
        <a href="/calculators" className="uc-back">&larr; All Calculators</a>
        <div className="uc-tag">Engineering Tools</div>
        <h1 className="uc-h1">Unit Converter</h1>
        <p className="uc-sub">Convert between SI, Imperial and engineering units across 17 categories. Covers length, force, stress, moment, inertia and more.</p>
      </div>

      <div className="uc-body">
        {/* ── Main converter ── */}
        <div className="uc-card">
          <div className="uc-card-title"><span className="accent">{cat.icon}</span> {cat.label} Converter</div>

          {/* Value input */}
          <div className="uc-input-row">
            <input
              className="uc-big-input"
              type="text"
              inputMode="decimal"
              value={inputStr}
              placeholder="0"
              onChange={e => {
                const v = e.target.value
                if (v === '' || v === '-' || v === '.' || v === '-.' || /^-?\d*\.?\d*(?:[eE][+-]?\d*)?$/.test(v)) setInputStr(v)
              }}
            />
          </div>

          {/* Unit selectors */}
          <div className="uc-unit-row">
            <button className="uc-unit-btn" onClick={() => openPicker('from')}>
              <div className="uc-unit-btn-right">
                <div className="uc-unit-btn-label">From</div>
                <div className="uc-unit-btn-sym">{fromSym}</div>
                <div className="uc-unit-btn-name">{cat.units.find(u => u.symbol === fromSym)?.name}</div>
              </div>
            </button>

            <button className="uc-swap" onClick={handleSwap} title="Swap units">&#8644;</button>

            <button className="uc-unit-btn" onClick={() => openPicker('to')}>
              <div className="uc-unit-btn-right">
                <div className="uc-unit-btn-label">To</div>
                <div className="uc-unit-btn-sym">{toSym}</div>
                <div className="uc-unit-btn-name">{cat.units.find(u => u.symbol === toSym)?.name}</div>
              </div>
            </button>
          </div>

          {/* Result */}
          <div className="uc-result-box">
            <div>
              <div style={{ fontSize: 11, color: '#666', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4 }}>Result</div>
              <span className="uc-result-val">{fmt(result)}</span>
              <span className="uc-result-unit"> {toSym}</span>
            </div>
            <button className={`uc-copy-sm${copied === 'main' ? ' ok' : ''}`} onClick={() => doCopy(`${fmt(result)} ${toSym}`, 'main')}>
              {copied === 'main' ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* ── Picker overlay ── */}
        {picker && (
          <div className="pk-overlay" onClick={() => setPicker(null)}>
            <div className="pk-panel" onClick={e => e.stopPropagation()}>
              <div className="pk-top">
                <input
                  ref={searchInputRef}
                  className="pk-search"
                  type="text"
                  placeholder="Search units or categories..."
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                />
                <button className="pk-close" onClick={() => setPicker(null)}>&times;</button>
              </div>
              <div className="pk-body">
                <div className="pk-cats">
                  {CATEGORIES.map((c, i) => {
                    if (pickerSearch.trim() && !pickerFilteredCats.includes(i)) return null
                    return (
                      <button key={c.id} className={`pk-cat-btn${pickerCat === i ? ' active' : ''}`} onClick={() => setPickerCat(i)}>
                        <span className="pk-cat-icon">{c.icon}</span>{c.label}
                      </button>
                    )
                  })}
                </div>
                <div className="pk-units">
                  {pickerFilteredUnits.map(u => {
                    const isSel = (picker === 'from' && pickerCat === catIdx && u.symbol === fromSym)
                      || (picker === 'to' && pickerCat === catIdx && u.symbol === toSym)
                    return (
                      <button key={u.symbol} className={`pk-chip${isSel ? ' selected' : ''}`} onClick={() => pickUnit(u.symbol, pickerCat)}>
                        <span className="pk-chip-sym">{u.symbol}</span>
                        <span className="pk-chip-name">{u.name}</span>
                      </button>
                    )
                  })}
                  {pickerFilteredUnits.length === 0 && <div style={{ color: '#555', fontSize: 13, padding: 12 }}>No units match your search</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── All conversions table ── */}
        <div className="uc-card">
          <div className="uc-card-title">All <span className="accent">Conversions</span></div>
          <div style={{ overflowX: 'auto' }}>
            <table className="uc-tbl">
              <thead><tr><th>Unit</th><th>Symbol</th><th>Value</th><th></th></tr></thead>
              <tbody>
                {allConv.map((r, i) => (
                  <tr key={r.sym} className={r.sym === fromSym || r.sym === toSym ? 'hl' : ''}>
                    <td>{r.name}</td>
                    <td className="sym">{r.sym}</td>
                    <td className="val">{fmt(r.value)}</td>
                    <td><button className={`uc-copy-sm${copied === `t-${i}` ? ' ok' : ''}`} onClick={() => doCopy(`${fmt(r.value)} ${r.sym}`, `t-${i}`)}>
                      {copied === `t-${i}` ? 'Copied' : 'Copy'}
                    </button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Quick tools ── */}
        <div className="uc-card">
          <div className="uc-card-title">Quick <span className="accent">Tools</span></div>
          <div className="qt-grid">
            {/* NL converter */}
            <div className="qt-card">
              <div className="qt-title">Natural Language Converter</div>
              <div className="qt-row">
                <input className="qt-input" style={{ flex: 1 }} placeholder='e.g. "10 kN in lbf"' value={nlQuery}
                  onChange={e => setNlQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') runNl() }}
                />
                <button className="qt-btn" onClick={runNl}>Convert</button>
              </div>
              {nlResult && <div className={`qt-result ${nlResult.error ? 'err' : 'ok'}`}>{nlResult.text}</div>}
            </div>

            {/* Load helper */}
            <div className="qt-card">
              <div className="qt-title">Load Conversion Helper</div>
              <div className="qt-row">
                <input className="qt-input" style={{ flex: 1 }} type="number" step="any" value={helpForce} onChange={e => setHelpForce(e.target.value)} />
                <select className="qt-select" style={{ width: 90 }} value={helpForceUnit} onChange={e => setHelpForceUnit(e.target.value)}>
                  {forceCat.units.map(u => <option key={u.symbol} value={u.symbol}>{u.symbol}</option>)}
                </select>
              </div>
              <div className="qt-row" style={{ fontSize: 11, color: '#666', gap: 4, flexWrap: 'wrap' }}>
                <span>over length</span>
                <input className="qt-input" style={{ width: 60 }} type="number" step="any" value={helpLength} onChange={e => setHelpLength(e.target.value)} />
                <span>m &nbsp; area</span>
                <input className="qt-input" style={{ width: 60 }} type="number" step="any" value={helpArea} onChange={e => setHelpArea(e.target.value)} />
                <span>m&sup2;</span>
              </div>
              <div className="qt-result ok" style={{ lineHeight: 2 }}>
                <div>Force: <b>{fmt(hfNewtons)} N</b> = {fmt(hfNewtons / 1000)} kN = {fmt(hfNewtons / 4.4482216152605)} lbf</div>
                {hlVal > 0 && <div>Distributed: <b>{fmt(hfNewtons / hlVal)} N/m</b> = {fmt(hfNewtons / hlVal / 1000)} kN/m = {fmt(hfNewtons / hlVal / 14.593903)} lbf/ft</div>}
                {haVal > 0 && <div>Pressure: <b>{fmt(hfNewtons / haVal)} Pa</b> = {fmt(hfNewtons / haVal / 1000)} kPa = {fmt(hfNewtons / haVal / 6894.757293168)} psi</div>}
              </div>
            </div>
          </div>
        </div>

        {/* ── Recent conversions ── */}
        {history.length > 0 && (
          <div className="uc-card">
            <div className="uc-card-title">Recent <span className="accent">Conversions</span></div>
            {history.map(h => (
              <div key={h.id} className="uc-hist-item" onClick={() => {
                const ci = CATEGORIES.findIndex(c => c.id === h.catId)
                if (ci >= 0) { setCatIdx(ci); setFromSym(h.fromSym); setToSym(h.toSym); setInputStr(String(h.value)) }
              }}>
                <span className="uc-hist-cat">{CATEGORIES.find(c => c.id === h.catId)?.label}</span>
                <span className="uc-hist-val">{fmt(h.value)}</span>
                <span className="uc-hist-val">{h.fromSym}</span>
                <span className="uc-hist-arrow">&rarr;</span>
                <span className="uc-hist-val">{fmt(h.result)}</span>
                <span className="uc-hist-val">{h.toSym}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
