import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Engineering Unit Converter | Enginus',
  description:
    'Convert engineering units instantly. Force, moment, stress, pressure, length and 15+ categories. SI and Imperial units for structural engineers.',
}

export default function UnitConverterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
