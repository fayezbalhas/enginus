import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard | Enginus',
  description: 'Your Enginus dashboard. View subscription status, access free and pro structural engineering tools.',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
