'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Navbar from '../../components/Navbar'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UnitDef {
  name: string
  symbol: string
  toBase: number // multiply value in this unit by toBase to get base-unit value
}

interface CategoryDef {
  label: string
  icon: string
  baseUnit: string
  units: UnitDef[]
  convert?: (value: number, from: string, to: string) => number
}

interface HistoryEntry {
  category: string
  fromValue: number
  fromUnit: string
  toValue: number
  toUnit: string
}

interface FavoritePair {
  category: string
  fromUnit: string
  toUnit: string
}

/* ------------------------------------------------------------------ */
/*  Category definitions with conversion factors                       */
/* ------------------------------------------------------------------ */

const CATEGORIES: CategoryDef[] = [
  {
    label: 'Length',
    icon: 'L',
    baseUnit: 'm',
    units: [
      { name: 'Millimeter', symbol: 'mm', toBase: 0.001 },
      { name: 'Centimeter', symbol: 'cm', toBase: 0.01 },
      { name: 'Meter', symbol: 'm', toBase: 1 },
      { name: 'Kilometer', symbol: 'km', toBase: 1000 },
      { name: 'Inch', symbol: 'in', toBase: 0.0254 },
      { name: 'Foot', symbol: 'ft', toBase: 0.3048 },
      { name: 'Yard', symbol: 'yd', toBase: 0.9144 },
      { name: 'Mile', symbol: 'mi', toBase: 1609.344 },
    ],
  },
  {
    label: 'Area',
    icon: 'A',
    baseUnit: 'm2',
    units: [
      { name: 'Square Millimeter', symbol: 'mm²', toBase: 1e-6 },
      { name: 'Square Centimeter', symbol: 'cm²', toBase: 1e-4 },
      { name: 'Square Meter', symbol: 'm²', toBase: 1 },
      { name: 'Square Kilometer', symbol: 'km²', toBase: 1e6 },
      { name: 'Square Inch', symbol: 'in²', toBase: 6.4516e-4 },
      { name: 'Square Foot', symbol: 'ft²', toBase: 0.09290304 },
      { name: 'Acre', symbol: 'acre', toBase: 4046.8564224 },
      { name: 'Hectare', symbol: 'hectare', toBase: 10000 },
    ],
  },
  {
    label: 'Volume',
    icon: 'V',
    baseUnit: 'm3',
    units: [
      { name: 'Cubic Millimeter', symbol: 'mm³', toBase: 1e-9 },
      { name: 'Cubic Centimeter', symbol: 'cm³', toBase: 1e-6 },
      { name: 'Cubic Meter', symbol: 'm³', toBase: 1 },
      { name: 'Liter', symbol: 'L', toBase: 0.001 },
      { name: 'Milliliter', symbol: 'mL', toBase: 1e-6 },
      { name: 'Cubic Inch', symbol: 'in³', toBase: 1.6387064e-5 },
      { name: 'Cubic Foot', symbol: 'ft³', toBase: 0.028316846592 },
      { name: 'Gallon (US)', symbol: 'gal (US)', toBase: 0.003785411784 },
      { name: 'Gallon (UK)', symbol: 'gal (UK)', toBase: 0.00454609 },
    ],
  },
  {
    label: 'Mass/Weight',
    icon: 'M',
    baseUnit: 'kg',
    units: [
      { name: 'Gram', symbol: 'g', toBase: 0.001 },
      { name: 'Kilogram', symbol: 'kg', toBase: 1 },
      { name: 'Tonne', symbol: 'tonne', toBase: 1000 },
      { name: 'Pound', symbol: 'lb', toBase: 0.45359237 },
      { name: 'Ounce', symbol: 'oz', toBase: 0.028349523125 },
      { name: 'Kip', symbol: 'kip', toBase: 453.59237 },
      { name: 'Ton (US)', symbol: 'ton (US)', toBase: 907.18474 },
      { name: 'Ton (UK)', symbol: 'ton (UK)', toBase: 1016.0469088 },
    ],
  },
  {
    label: 'Force',
    icon: 'F',
    baseUnit: 'N',
    units: [
      { name: 'Newton', symbol: 'N', toBase: 1 },
      { name: 'Kilonewton', symbol: 'kN', toBase: 1000 },
      { name: 'Meganewton', symbol: 'MN', toBase: 1e6 },
      { name: 'Kilogram-force', symbol: 'kgf', toBase: 9.80665 },
      { name: 'Pound-force', symbol: 'lbf', toBase: 4.4482216152605 },
      { name: 'Kip', symbol: 'kip', toBase: 4448.2216152605 },
    ],
  },
  {
    label: 'Pressure/Stress',
    icon: 'P',
    baseUnit: 'Pa',
    units: [
      { name: 'Pascal', symbol: 'Pa', toBase: 1 },
      { name: 'Kilopascal', symbol: 'kPa', toBase: 1000 },
      { name: 'Megapascal', symbol: 'MPa', toBase: 1e6 },
      { name: 'Gigapascal', symbol: 'GPa', toBase: 1e9 },
      { name: 'Pounds per sq inch', symbol: 'psi', toBase: 6894.757293168 },
      { name: 'Kips per sq inch', symbol: 'ksi', toBase: 6894757.293168 },
      { name: 'Bar', symbol: 'bar', toBase: 100000 },
      { name: 'Atmosphere', symbol: 'atm', toBase: 101325 },
      { name: 'mmHg', symbol: 'mmHg', toBase: 133.322387415 },
    ],
  },
  {
    label: 'Moment/Torque',
    icon: 'T',
    baseUnit: 'Nm',
    units: [
      { name: 'Newton-meter', symbol: 'N·m', toBase: 1 },
      { name: 'Kilonewton-meter', symbol: 'kN·m', toBase: 1000 },
      { name: 'Meganewton-meter', symbol: 'MN·m', toBase: 1e6 },
      { name: 'Pound-force foot', symbol: 'lbf·ft', toBase: 1.3558179483314 },
      { name: 'Kip-foot', symbol: 'kip·ft', toBase: 1355.8179483314 },
      { name: 'Kip-inch', symbol: 'kip·in', toBase: 112.98482902762 },
    ],
  },
  {
    label: 'Distributed Load',
    icon: 'D',
    baseUnit: 'N/m',
    units: [
      { name: 'Newton per meter', symbol: 'N/m', toBase: 1 },
      { name: 'Kilonewton per meter', symbol: 'kN/m', toBase: 1000 },
      { name: 'Meganewton per meter', symbol: 'MN/m', toBase: 1e6 },
      { name: 'Pound-force per foot', symbol: 'lbf/ft', toBase: 14.593902937206 },
      { name: 'Kip per foot', symbol: 'kip/ft', toBase: 14593.902937206 },
    ],
  },
  {
    label: 'Temperature',
    icon: 'Tp',
    baseUnit: 'C',
    units: [
      { name: 'Celsius', symbol: '°C', toBase: 1 },
      { name: 'Fahrenheit', symbol: '°F', toBase: 1 },
      { name: 'Kelvin', symbol: 'K', toBase: 1 },
    ],
    convert: (value: number, from: string, to: string): number => {
      // Convert to Celsius first
      let celsius: number
      if (from === '°C') celsius = value
      else if (from === '°F') celsius = (value - 32) * 5 / 9
      else celsius = value - 273.15 // K

      // Convert from Celsius to target
      if (to === '°C') return celsius
      if (to === '°F') return celsius * 9 / 5 + 32
      return celsius + 273.15 // K
    },
  },
  {
    label: 'Energy',
    icon: 'E',
    baseUnit: 'J',
    units: [
      { name: 'Joule', symbol: 'J', toBase: 1 },
      { name: 'Kilojoule', symbol: 'kJ', toBase: 1000 },
      { name: 'Megajoule', symbol: 'MJ', toBase: 1e6 },
      { name: 'Calorie', symbol: 'cal', toBase: 4.184 },
      { name: 'Kilocalorie', symbol: 'kcal', toBase: 4184 },
      { name: 'BTU', symbol: 'BTU', toBase: 1055.05585262 },
      { name: 'Kilowatt-hour', symbol: 'kWh', toBase: 3600000 },
    ],
  },
  {
    label: 'Power',
    icon: 'Pw',
    baseUnit: 'W',
    units: [
      { name: 'Watt', symbol: 'W', toBase: 1 },
      { name: 'Kilowatt', symbol: 'kW', toBase: 1000 },
      { name: 'Megawatt', symbol: 'MW', toBase: 1e6 },
      { name: 'Horsepower', symbol: 'hp', toBase: 745.69987158227 },
      { name: 'BTU per hour', symbol: 'BTU/hr', toBase: 0.29307107017222 },
    ],
  },
  {
    label: 'Speed',
    icon: 'Sp',
    baseUnit: 'm/s',
    units: [
      { name: 'Meters per second', symbol: 'm/s', toBase: 1 },
      { name: 'Kilometers per hour', symbol: 'km/h', toBase: 1 / 3.6 },
      { name: 'Miles per hour', symbol: 'mph', toBase: 0.44704 },
      { name: 'Feet per second', symbol: 'ft/s', toBase: 0.3048 },
      { name: 'Knot', symbol: 'knot', toBase: 0.514444444 },
    ],
  },
  {
    label: 'Angle',
    icon: 'An',
    baseUnit: 'rad',
    units: [
      { name: 'Degree', symbol: 'deg', toBase: Math.PI / 180 },
      { name: 'Radian', symbol: 'rad', toBase: 1 },
      { name: 'Gradian', symbol: 'grad', toBase: Math.PI / 200 },
    ],
  },
  {
    label: 'Time',
    icon: 'Ti',
    baseUnit: 's',
    units: [
      { name: 'Millisecond', symbol: 'ms', toBase: 0.001 },
      { name: 'Second', symbol: 's', toBase: 1 },
      { name: 'Minute', symbol: 'min', toBase: 60 },
      { name: 'Hour', symbol: 'hr', toBase: 3600 },
      { name: 'Day', symbol: 'day', toBase: 86400 },
    ],
  },
  {
    label: 'Density',
    icon: 'Dn',
    baseUnit: 'kg/m3',
    units: [
      { name: 'Kilogram per cubic meter', symbol: 'kg/m³', toBase: 1 },
      { name: 'Gram per cubic centimeter', symbol: 'g/cm³', toBase: 1000 },
      { name: 'Pound per cubic foot', symbol: 'lb/ft³', toBase: 16.01846337396 },
      { name: 'Pound per cubic inch', symbol: 'lb/in³', toBase: 27679.904710191 },
    ],
  },
  {
    label: 'Moment of Inertia',
    icon: 'I',
    baseUnit: 'm4',
    units: [
      { name: 'mm⁴', symbol: 'mm⁴', toBase: 1e-12 },
      { name: 'cm⁴', symbol: 'cm⁴', toBase: 1e-8 },
      { name: 'm⁴', symbol: 'm⁴', toBase: 1 },
      { name: 'in⁴', symbol: 'in⁴', toBase: 4.16231426e-7 },
      { name: 'ft⁴', symbol: 'ft⁴', toBase: 8.63097484e-3 },
    ],
  },
  {
    label: 'Section Modulus',
    icon: 'S',
    baseUnit: 'm3',
    units: [
      { name: 'mm³', symbol: 'mm³', toBase: 1e-9 },
      { name: 'cm³', symbol: 'cm³', toBase: 1e-6 },
      { name: 'm³', symbol: 'm³', toBase: 1 },
      { name: 'in³', symbol: 'in³', toBase: 1.6387064e-5 },
      { name: 'ft³', symbol: 'ft³', toBase: 0.028316846592 },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function convertValue(cat: CategoryDef, value: number, fromSymbol: string, toSymbol: string): number {
  if (cat.convert) return cat.convert(value, fromSymbol, toSymbol)
  const fromUnit = cat.units.find(u => u.symbol === fromSymbol)
  const toUnit = cat.units.find(u => u.symbol === toSymbol)
  if (!fromUnit || !toUnit) return 0
  return (value * fromUnit.toBase) / toUnit.toBase
}

function formatNumber(n: number): string {
  if (n === 0) return '0'
  const abs = Math.abs(n)
  if (abs >= 1e15 || (abs < 1e-10 && abs > 0)) return n.toExponential(6)
  if (abs >= 1e6) return n.toLocaleString('en-US', { maximumFractionDigits: 4 })
  if (abs >= 1) return n.toLocaleString('en-US', { maximumFractionDigits: 8 })
  if (abs >= 0.001) return n.toLocaleString('en-US', { maximumFractionDigits: 10 })
  return n.toExponential(6)
}

function isFavorite(favorites: FavoritePair[], cat: string, from: string, to: string): boolean {
  return favorites.some(f => f.category === cat && f.fromUnit === from && f.toUnit === to)
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function UnitConverterPage() {
  const [activeCat, setActiveCat] = useState(0)
  const [inputValue, setInputValue] = useState('1')
  const [fromUnit, setFromUnit] = useState(CATEGORIES[0].units[0].symbol)
  const [toUnit, setToUnit] = useState(CATEGORIES[0].units[1].symbol)
  const [swapRotation, setSwapRotation] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [favorites, setFavorites] = useState<FavoritePair[]>([])
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [copiedResult, setCopiedResult] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const cat = CATEGORIES[activeCat]
  const numericValue = parseFloat(inputValue) || 0
  const result = convertValue(cat, numericValue, fromUnit, toUnit)

  // Close search dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // When category changes, set default units
  const switchCategory = useCallback((idx: number) => {
    setActiveCat(idx)
    const c = CATEGORIES[idx]
    setFromUnit(c.units[0].symbol)
    setToUnit(c.units.length > 1 ? c.units[1].symbol : c.units[0].symbol)
    setInputValue('1')
  }, [])

  // Add to history
  const addToHistory = useCallback(() => {
    if (numericValue === 0) return
    const entry: HistoryEntry = {
      category: cat.label,
      fromValue: numericValue,
      fromUnit,
      toValue: result,
      toUnit,
    }
    setHistory(prev => {
      const next = [entry, ...prev.filter(h =>
        !(h.category === entry.category && h.fromUnit === entry.fromUnit && h.toUnit === entry.toUnit && h.fromValue === entry.fromValue)
      )]
      return next.slice(0, 5)
    })
  }, [numericValue, cat.label, fromUnit, toUnit, result])

  // Auto-add to history on meaningful conversions
  useEffect(() => {
    if (numericValue !== 0 && fromUnit !== toUnit) {
      const timer = setTimeout(addToHistory, 800)
      return () => clearTimeout(timer)
    }
  }, [numericValue, fromUnit, toUnit, addToHistory])

  const handleSwap = () => {
    setSwapRotation(prev => prev + 180)
    const temp = fromUnit
    setFromUnit(toUnit)
    setToUnit(temp)
  }

  const toggleFavorite = (catLabel: string, from: string, to: string) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.category === catLabel && f.fromUnit === from && f.toUnit === to)
      if (exists) return prev.filter(f => !(f.category === catLabel && f.fromUnit === from && f.toUnit === to))
      return [...prev, { category: catLabel, fromUnit: from, toUnit: to }]
    })
  }

  const copyToClipboard = (text: string, idx?: number) => {
    navigator.clipboard.writeText(text).then(() => {
      if (idx !== undefined) {
        setCopiedIdx(idx)
        setTimeout(() => setCopiedIdx(null), 1500)
      } else {
        setCopiedResult(true)
        setTimeout(() => setCopiedResult(false), 1500)
      }
    })
  }

  // Search results
  const searchResults = searchQuery.trim().length > 0
    ? CATEGORIES.map((c, ci) => ({
        catIndex: ci,
        catLabel: c.label,
        matches: c.units.filter(u =>
          u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.symbol.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter(r => r.matches.length > 0)
    : []

  const handleSearchSelect = (catIdx: number, unitSymbol: string) => {
    switchCategory(catIdx)
    setFromUnit(unitSymbol)
    const c = CATEGORIES[catIdx]
    const otherUnit = c.units.find(u => u.symbol !== unitSymbol)
    if (otherUnit) setToUnit(otherUnit.symbol)
    setSearchQuery('')
    setSearchOpen(false)
  }

  // All conversions for current value
  const allConversions = cat.units.map((u, i) => ({
    unit: u,
    value: convertValue(cat, numericValue, fromUnit, u.symbol),
    index: i,
  }))

  // Current category favorites
  const catFavorites = favorites.filter(f => f.category === cat.label)

  return (
    <main className="uc-main">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .uc-main {
          background: #0a0a0a;
          color: #f0f0f0;
          font-family: 'Inter', sans-serif;
          min-height: 100vh;
        }

        .uc-layout {
          display: flex;
          min-height: calc(100vh - 64px);
        }

        /* ---------- Sidebar ---------- */
        .uc-sidebar {
          width: 220px;
          min-width: 220px;
          background: #111;
          border-right: 1px solid #1e1e1e;
          padding: 16px 0;
          overflow-y: auto;
        }

        .uc-sidebar-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #555;
          padding: 8px 20px 12px;
        }

        .uc-cat-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 20px;
          background: none;
          border: none;
          color: #888;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
          border-left: 2px solid transparent;
        }

        .uc-cat-btn:hover {
          color: #ccc;
          background: rgba(255,255,255,0.03);
        }

        .uc-cat-btn.active {
          color: #f0f0f0;
          background: rgba(204,0,0,0.08);
          border-left-color: #cc0000;
        }

        .uc-cat-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 4px;
          background: #1a1a1a;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: #666;
          flex-shrink: 0;
          font-family: 'Space Grotesk', sans-serif;
        }

        .uc-cat-btn.active .uc-cat-icon {
          background: rgba(204,0,0,0.15);
          color: #ff4444;
        }

        /* ---------- Content ---------- */
        .uc-content {
          flex: 1;
          padding: 32px 40px;
          max-width: 960px;
          overflow-y: auto;
        }

        /* ---------- Search ---------- */
        .uc-search-wrap {
          position: relative;
          margin-bottom: 28px;
        }

        .uc-search-input {
          width: 100%;
          padding: 12px 16px 12px 40px;
          background: #111;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
          color: #f0f0f0;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          outline: none;
          transition: border-color 0.2s;
        }

        .uc-search-input:focus {
          border-color: #cc0000;
        }

        .uc-search-input::placeholder {
          color: #555;
        }

        .uc-search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #555;
          font-size: 14px;
          pointer-events: none;
        }

        .uc-search-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: #151515;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
          max-height: 320px;
          overflow-y: auto;
          z-index: 50;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }

        .uc-search-cat-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #555;
          padding: 10px 16px 4px;
        }

        .uc-search-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 16px;
          cursor: pointer;
          transition: background 0.1s;
          border: none;
          background: none;
          width: 100%;
          color: #ccc;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          text-align: left;
        }

        .uc-search-item:hover {
          background: rgba(204,0,0,0.1);
          color: #f0f0f0;
        }

        .uc-search-item-sym {
          font-family: 'Geist Mono', 'SF Mono', 'Fira Code', monospace;
          color: #ff4444;
          font-size: 12px;
        }

        /* ---------- Converter Card ---------- */
        .uc-card {
          background: #111;
          border: 1px solid #1e1e1e;
          border-radius: 12px;
          padding: 28px;
          margin-bottom: 24px;
        }

        .uc-card-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .uc-card-title-accent {
          color: #cc0000;
        }

        .uc-converter-row {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .uc-converter-side {
          flex: 1;
          min-width: 0;
        }

        .uc-converter-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #666;
          margin-bottom: 8px;
        }

        .uc-input-big {
          width: 100%;
          padding: 16px;
          background: #0a0a0a;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
          color: #f0f0f0;
          font-family: 'Geist Mono', 'SF Mono', 'Fira Code', monospace;
          font-size: 24px;
          font-weight: 500;
          outline: none;
          transition: border-color 0.2s;
        }

        .uc-input-big:focus {
          border-color: #cc0000;
        }

        .uc-result-big {
          width: 100%;
          padding: 16px;
          background: #0a0a0a;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
          color: #ff4444;
          font-family: 'Geist Mono', 'SF Mono', 'Fira Code', monospace;
          font-size: 24px;
          font-weight: 500;
          min-height: 62px;
          display: flex;
          align-items: center;
          word-break: break-all;
          position: relative;
        }

        .uc-select {
          width: 100%;
          padding: 10px 12px;
          background: #0a0a0a;
          border: 1px solid #2a2a2a;
          border-radius: 6px;
          color: #f0f0f0;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          outline: none;
          margin-top: 8px;
          cursor: pointer;
          transition: border-color 0.2s;
          appearance: none;
          -webkit-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 32px;
        }

        .uc-select:focus {
          border-color: #cc0000;
        }

        .uc-select option {
          background: #111;
          color: #f0f0f0;
        }

        .uc-swap-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding-top: 28px;
        }

        .uc-swap-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          color: #ccc;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
        }

        .uc-swap-btn:hover {
          background: rgba(204,0,0,0.15);
          border-color: #cc0000;
          color: #ff4444;
        }

        .uc-copy-result-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          color: #888;
          font-size: 12px;
          padding: 4px 10px;
          border-radius: 4px;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: all 0.15s;
        }

        .uc-copy-result-btn:hover {
          background: #222;
          color: #ccc;
        }

        .uc-copy-result-btn.copied {
          background: rgba(204,0,0,0.15);
          border-color: #cc0000;
          color: #ff4444;
        }

        .uc-fav-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          color: #444;
          padding: 2px 6px;
          transition: color 0.15s;
          line-height: 1;
        }

        .uc-fav-btn:hover {
          color: #cc0000;
        }

        .uc-fav-btn.active {
          color: #cc0000;
        }

        /* ---------- All Conversions Table ---------- */
        .uc-table-wrap {
          margin-top: 0;
        }

        .uc-table-title {
          font-size: 13px;
          font-weight: 600;
          color: #888;
          margin-bottom: 12px;
          letter-spacing: 0.04em;
        }

        .uc-table {
          width: 100%;
          border-collapse: collapse;
        }

        .uc-table th {
          text-align: left;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #555;
          padding: 8px 12px;
          border-bottom: 1px solid #1e1e1e;
        }

        .uc-table td {
          padding: 8px 12px;
          font-size: 13px;
          border-bottom: 1px solid #141414;
          color: #ccc;
        }

        .uc-table tr:hover td {
          background: rgba(255,255,255,0.02);
        }

        .uc-table .uc-val {
          font-family: 'Geist Mono', 'SF Mono', 'Fira Code', monospace;
          color: #f0f0f0;
        }

        .uc-table .uc-sym {
          font-family: 'Geist Mono', 'SF Mono', 'Fira Code', monospace;
          color: #888;
          font-size: 12px;
        }

        .uc-table .uc-active-row td {
          background: rgba(204,0,0,0.06);
          color: #ff4444;
        }

        .uc-copy-btn {
          background: #1a1a1a;
          border: 1px solid #222;
          color: #666;
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 3px;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: all 0.15s;
        }

        .uc-copy-btn:hover {
          background: #222;
          color: #ccc;
        }

        .uc-copy-btn.copied {
          background: rgba(204,0,0,0.15);
          border-color: #cc0000;
          color: #ff4444;
        }

        /* ---------- Favorites ---------- */
        .uc-favorites-section {
          margin-bottom: 16px;
        }

        .uc-fav-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(204,0,0,0.08);
          border: 1px solid rgba(204,0,0,0.2);
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 12px;
          color: #ccc;
          cursor: pointer;
          transition: all 0.15s;
          margin-right: 8px;
          margin-bottom: 6px;
        }

        .uc-fav-tag:hover {
          background: rgba(204,0,0,0.15);
          border-color: rgba(204,0,0,0.4);
        }

        .uc-fav-tag-arrow {
          color: #cc0000;
          font-weight: 700;
        }

        .uc-fav-tag-remove {
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
          font-size: 14px;
          padding: 0 2px;
          line-height: 1;
          transition: color 0.15s;
        }

        .uc-fav-tag-remove:hover {
          color: #ff4444;
        }

        /* ---------- History ---------- */
        .uc-history-title {
          font-size: 13px;
          font-weight: 600;
          color: #888;
          margin-bottom: 10px;
          letter-spacing: 0.04em;
        }

        .uc-history-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #0d0d0d;
          border: 1px solid #1a1a1a;
          border-radius: 6px;
          margin-bottom: 6px;
          font-size: 13px;
          color: #888;
          cursor: pointer;
          transition: all 0.15s;
        }

        .uc-history-item:hover {
          background: #111;
          border-color: #2a2a2a;
          color: #ccc;
        }

        .uc-history-cat {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #555;
          min-width: 80px;
        }

        .uc-history-val {
          font-family: 'Geist Mono', 'SF Mono', 'Fira Code', monospace;
          color: #ccc;
        }

        .uc-history-arrow {
          color: #cc0000;
          font-weight: 700;
        }

        /* ---------- Mobile sidebar -> horizontal ---------- */
        .uc-mobile-cats {
          display: none;
          overflow-x: auto;
          white-space: nowrap;
          padding: 12px 16px;
          background: #111;
          border-bottom: 1px solid #1e1e1e;
          gap: 6px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }

        .uc-mobile-cats::-webkit-scrollbar {
          display: none;
        }

        .uc-mobile-cat-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: #1a1a1a;
          border: 1px solid #222;
          border-radius: 20px;
          color: #888;
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .uc-mobile-cat-btn:hover {
          color: #ccc;
          border-color: #333;
        }

        .uc-mobile-cat-btn.active {
          background: rgba(204,0,0,0.12);
          border-color: #cc0000;
          color: #ff4444;
        }

        /* ---------- Responsive ---------- */
        @media (max-width: 767px) {
          .uc-sidebar {
            display: none;
          }

          .uc-mobile-cats {
            display: flex;
          }

          .uc-content {
            padding: 20px 16px;
          }

          .uc-converter-row {
            flex-direction: column;
            gap: 12px;
          }

          .uc-swap-col {
            padding-top: 0;
            flex-direction: row;
            justify-content: center;
          }

          .uc-input-big, .uc-result-big {
            font-size: 18px;
            padding: 14px;
          }

          .uc-card {
            padding: 20px;
          }

          .uc-card-title {
            font-size: 18px;
          }
        }
      `}</style>

      <Navbar activePage="calculators" />

      {/* Mobile horizontal categories */}
      <div className="uc-mobile-cats">
        {CATEGORIES.map((c, i) => (
          <button
            key={c.label}
            className={`uc-mobile-cat-btn${i === activeCat ? ' active' : ''}`}
            onClick={() => switchCategory(i)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="uc-layout">
        {/* Sidebar */}
        <aside className="uc-sidebar">
          <div className="uc-sidebar-title">Categories</div>
          {CATEGORIES.map((c, i) => (
            <button
              key={c.label}
              className={`uc-cat-btn${i === activeCat ? ' active' : ''}`}
              onClick={() => switchCategory(i)}
            >
              <span className="uc-cat-icon">{c.icon}</span>
              {c.label}
            </button>
          ))}
        </aside>

        {/* Main content */}
        <div className="uc-content">
          {/* Search */}
          <div className="uc-search-wrap" ref={searchRef}>
            <span className="uc-search-icon">&#8981;</span>
            <input
              className="uc-search-input"
              type="text"
              placeholder="Search units across all categories..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true) }}
              onFocus={() => { if (searchQuery.trim()) setSearchOpen(true) }}
            />
            {searchOpen && searchResults.length > 0 && (
              <div className="uc-search-dropdown">
                {searchResults.map(group => (
                  <div key={group.catLabel}>
                    <div className="uc-search-cat-label">{group.catLabel}</div>
                    {group.matches.map(u => (
                      <button
                        key={`${group.catLabel}-${u.symbol}`}
                        className="uc-search-item"
                        onClick={() => handleSearchSelect(group.catIndex, u.symbol)}
                      >
                        <span>{u.name}</span>
                        <span className="uc-search-item-sym">{u.symbol}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Favorites for current category */}
          {catFavorites.length > 0 && (
            <div className="uc-favorites-section">
              {catFavorites.map(fav => (
                <span
                  key={`${fav.fromUnit}-${fav.toUnit}`}
                  className="uc-fav-tag"
                  onClick={() => { setFromUnit(fav.fromUnit); setToUnit(fav.toUnit) }}
                >
                  {fav.fromUnit} <span className="uc-fav-tag-arrow">&#8594;</span> {fav.toUnit}
                  <button
                    className="uc-fav-tag-remove"
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(fav.category, fav.fromUnit, fav.toUnit) }}
                    title="Remove favorite"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Main converter */}
          <div className="uc-card">
            <div className="uc-card-title">
              <span className="uc-card-title-accent">{cat.icon}</span>
              {cat.label} Converter
              <button
                className={`uc-fav-btn${isFavorite(favorites, cat.label, fromUnit, toUnit) ? ' active' : ''}`}
                onClick={() => toggleFavorite(cat.label, fromUnit, toUnit)}
                title={isFavorite(favorites, cat.label, fromUnit, toUnit) ? 'Remove from favorites' : 'Add to favorites'}
              >
                {isFavorite(favorites, cat.label, fromUnit, toUnit) ? '★' : '☆'}
              </button>
            </div>

            <div className="uc-converter-row">
              {/* From */}
              <div className="uc-converter-side">
                <div className="uc-converter-label">From</div>
                <input
                  ref={inputRef}
                  className="uc-input-big"
                  type="text"
                  inputMode="decimal"
                  value={inputValue}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === '' || v === '-' || v === '.' || v === '-.' || /^-?\d*\.?\d*(?:[eE][+-]?\d*)?$/.test(v)) {
                      setInputValue(v)
                    }
                  }}
                  placeholder="0"
                />
                <select
                  className="uc-select"
                  value={fromUnit}
                  onChange={(e) => setFromUnit(e.target.value)}
                >
                  {cat.units.map(u => (
                    <option key={u.symbol} value={u.symbol}>{u.name} ({u.symbol})</option>
                  ))}
                </select>
              </div>

              {/* Swap */}
              <div className="uc-swap-col">
                <button
                  className="uc-swap-btn"
                  onClick={handleSwap}
                  title="Swap units"
                  style={{ transform: `rotate(${swapRotation}deg)`, transition: 'transform 0.3s ease' }}
                >
                  &#8644;
                </button>
              </div>

              {/* To */}
              <div className="uc-converter-side">
                <div className="uc-converter-label">To</div>
                <div className="uc-result-big">
                  <span style={{ paddingRight: '40px' }}>{formatNumber(result)}</span>
                  <button
                    className={`uc-copy-result-btn${copiedResult ? ' copied' : ''}`}
                    onClick={() => copyToClipboard(formatNumber(result))}
                    title="Copy result"
                  >
                    {copiedResult ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <select
                  className="uc-select"
                  value={toUnit}
                  onChange={(e) => setToUnit(e.target.value)}
                >
                  {cat.units.map(u => (
                    <option key={u.symbol} value={u.symbol}>{u.name} ({u.symbol})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* All Conversions */}
          <div className="uc-card">
            <div className="uc-table-title">
              All conversions for {formatNumber(numericValue)} {fromUnit}
            </div>
            <div className="uc-table-wrap">
              <table className="uc-table">
                <thead>
                  <tr>
                    <th>Unit</th>
                    <th>Symbol</th>
                    <th>Value</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {allConversions.map((row, i) => (
                    <tr
                      key={row.unit.symbol}
                      className={row.unit.symbol === toUnit ? 'uc-active-row' : ''}
                    >
                      <td>{row.unit.name}</td>
                      <td className="uc-sym">{row.unit.symbol}</td>
                      <td className="uc-val">{formatNumber(row.value)}</td>
                      <td>
                        <button
                          className={`uc-copy-btn${copiedIdx === i ? ' copied' : ''}`}
                          onClick={() => copyToClipboard(`${formatNumber(row.value)} ${row.unit.symbol}`, i)}
                        >
                          {copiedIdx === i ? 'Copied' : 'Copy'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="uc-card">
              <div className="uc-history-title">Recent Conversions</div>
              {history.map((h, i) => (
                <div
                  key={i}
                  className="uc-history-item"
                  onClick={() => {
                    const catIdx = CATEGORIES.findIndex(c => c.label === h.category)
                    if (catIdx >= 0) {
                      setActiveCat(catIdx)
                      setFromUnit(h.fromUnit)
                      setToUnit(h.toUnit)
                      setInputValue(String(h.fromValue))
                    }
                  }}
                >
                  <span className="uc-history-cat">{h.category}</span>
                  <span className="uc-history-val">{formatNumber(h.fromValue)}</span>
                  <span className="uc-history-val">{h.fromUnit}</span>
                  <span className="uc-history-arrow">&#8594;</span>
                  <span className="uc-history-val">{formatNumber(h.toValue)}</span>
                  <span className="uc-history-val">{h.toUnit}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
