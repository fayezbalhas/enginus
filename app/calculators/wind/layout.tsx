import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Wind Load Calculator | EC1 & ASCE 7 | Enginus',
  description:
    'Wind load calculation per Eurocode 1 (EN 1991-1-4) and ASCE 7-22. Calculate velocity pressure, wind pressures on building surfaces, and total wind forces.',
}

export default function WindLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
