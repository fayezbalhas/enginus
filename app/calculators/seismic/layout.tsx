import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Seismic Base Shear Calculator | EC8 & ASCE 7 | Enginus',
  description:
    'Seismic base shear calculation per Eurocode 8 and ASCE 7-22. Compute design spectrum, lateral force distribution, and story shears for buildings.',
}

export default function SeismicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
