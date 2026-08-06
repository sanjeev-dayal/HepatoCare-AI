import { Activity, BarChart3, Brain, LayoutDashboard, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'

export type TabId = 'overview' | 'eda' | 'features' | 'predict'

const tabs: { id: TabId; label: string; icon: typeof LayoutDashboard; gradient: string }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, gradient: 'from-brand-400 to-brand-600' },
  { id: 'eda', label: 'EDA', icon: BarChart3, gradient: 'from-violet-400 to-violet-600' },
  { id: 'features', label: 'Feature Selection', icon: Sparkles, gradient: 'from-amber-400 to-orange-500' },
  { id: 'predict', label: 'Model Demo', icon: Brain, gradient: 'from-accent-400 to-accent-600' },
]

interface LayoutProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  children: ReactNode
}

export function Layout({ activeTab, onTabChange, children }: LayoutProps) {
  return (
    <div className="min-h-screen">
      <header className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-brand-900 to-violet-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-400/20 via-transparent to-violet-500/20" />
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
              <Activity className="h-6 w-6 text-brand-300" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Liver Disease Explorer
              </h1>
              <p className="mt-0.5 text-sm text-brand-100/80">
                Dataset analysis, feature selection &amp; ML predictions
              </p>
            </div>
          </div>

          <nav className="mt-8 flex flex-wrap gap-2">
            {tabs.map(({ id, label, icon: Icon, gradient }) => {
              const active = activeTab === id
              return (
                <button
                  key={id}
                  onClick={() => onTabChange(id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? `bg-gradient-to-r ${gradient} text-white shadow-lg shadow-black/20`
                      : 'bg-white/10 text-white/80 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
        Built with React &amp; FastAPI — explore liver disease data, Boruta features &amp; demo classifier
      </footer>
    </div>
  )
}
