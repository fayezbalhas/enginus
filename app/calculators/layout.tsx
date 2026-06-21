import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Structural Calculators | Enginus',
  description:
    'Free structural engineering calculators online. Beam analysis, unit conversion, rebar design. Eurocode and ACI, SI and Imperial units.',
}

export default function CalculatorsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
