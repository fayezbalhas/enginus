import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Enginus | Structural Engineering Tools',
  description:
    'Enginus provides free structural engineering calculators and professional design tools for civil and structural engineers worldwide.',
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
