import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  accent: 'brand' | 'violet' | 'amber' | 'rose'
}

const accentMap = {
  brand: 'from-brand-500 to-brand-600',
  violet: 'from-violet-400 to-violet-600',
  amber: 'from-amber-400 to-orange-500',
  rose: 'from-rose-400 to-accent-500',
}

export function StatCard({ title, value, subtitle, icon: Icon, accent }: StatCardProps) {
  return (
    <div className="card p-5 transition hover:shadow-glow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-1 font-display text-2xl font-bold text-slate-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
        </div>
        <div className={`rounded-xl bg-gradient-to-br ${accentMap[accent]} p-2.5 text-white shadow-md`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}
