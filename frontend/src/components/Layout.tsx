import {
  BarChart3,
  Brain,
  Clock,
  FileCheck2,
  HeartPulse,
  LayoutDashboard,
  ShieldAlert,
  Sparkles,
  Stethoscope,
} from 'lucide-react'
import type { ReactNode } from 'react'

export type TabId = 'dashboard' | 'assessment' | 'results' | 'explain' | 'performance' | 'history'

interface TabConfig {
  id: TabId
  step: string
  label: string
  sublabel: string
  icon: typeof LayoutDashboard
  badge?: string
}

const TABS: TabConfig[] = [
  {
    id: 'dashboard',
    step: '01',
    label: 'Dashboard',
    sublabel: 'Overview & Metrics',
    icon: LayoutDashboard,
  },
  {
    id: 'assessment',
    step: '02',
    label: 'Patient Assessment',
    sublabel: '10 Boruta Features',
    icon: Stethoscope,
  },
  {
    id: 'results',
    step: '03',
    label: 'Prediction Results',
    sublabel: '6-Class Probabilities',
    icon: FileCheck2,
  },
  {
    id: 'explain',
    step: '04',
    label: 'Explainable AI',
    sublabel: 'SHAP & Feature Impact',
    icon: Brain,
    badge: 'XAI',
  },
  {
    id: 'performance',
    step: '05',
    label: 'Model Performance',
    sublabel: 'LightGBM vs Transformer',
    icon: BarChart3,
  },
  {
    id: 'history',
    step: '06',
    label: 'Assessment History',
    sublabel: 'Synthetic Records & Export',
    icon: Clock,
  },
]

interface LayoutProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  hasActiveResult?: boolean
  children: ReactNode
}

export function Layout({ activeTab, onTabChange, hasActiveResult, children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Header / Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => onTabChange('dashboard')}
                className="group flex items-center gap-3 text-left focus:outline-none"
              >
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 shadow-lg shadow-cyan-500/20 ring-1 ring-white/20 transition-transform group-hover:scale-105">
                  <HeartPulse className="h-5 w-5 text-white" />
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg font-bold tracking-tight text-white group-hover:text-cyan-400 transition-colors">
                      HepatoCare <span className="text-cyan-400">AI</span>
                    </span>
                    <span className="rounded-full bg-cyan-950/80 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-800/60">
                      v2.0 LightGBM
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-none">
                    Multi-Class Clinical Decision Support System
                  </p>
                </div>
              </button>
            </div>

            {/* Quick Status Badges */}
            <div className="hidden md:flex items-center gap-3 text-xs">
              <div className="flex items-center gap-2 rounded-lg bg-slate-900/90 border border-slate-800 px-3 py-1.5 text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>Boruta Pipeline: <strong className="text-white">10 Features</strong></span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-slate-900/90 border border-slate-800 px-3 py-1.5 text-slate-300">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                <span>Model Accuracy: <strong className="text-cyan-300">88.40%</strong></span>
              </div>
              <button
                onClick={() => onTabChange('assessment')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-1.5 font-medium text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all active:scale-95"
              >
                <Stethoscope className="h-3.5 w-3.5" />
                <span>New Assessment</span>
              </button>
            </div>
          </div>

          {/* Primary Nav Tabs */}
          <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none border-t border-slate-800/60">
            {TABS.map((tab) => {
              const active = activeTab === tab.id
              const Icon = tab.icon
              const isResultsTab = tab.id === 'results'

              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`group relative flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-medium transition-all whitespace-nowrap ${
                    active
                      ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                      : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold ${
                      active
                        ? 'bg-cyan-500 text-slate-950 font-black'
                        : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'
                    }`}
                  >
                    {tab.step}
                  </span>
                  <Icon
                    className={`h-4 w-4 transition-colors ${
                      active ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  />
                  <span>{tab.label}</span>

                  {tab.badge && (
                    <span className="rounded bg-indigo-500/20 px-1.5 py-0.2 text-[9px] font-semibold text-indigo-300 border border-indigo-500/40">
                      {tab.badge}
                    </span>
                  )}

                  {isResultsTab && hasActiveResult && (
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 ring-2 ring-cyan-400/30" />
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-6 text-xs text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 border border-slate-800">
              <ShieldAlert className="h-3.5 w-3.5 text-cyan-400" />
            </div>
            <div>
              <p className="font-medium text-slate-300">
                HepatoCare AI Decision Support System &bull; Research &amp; Clinical Demo
              </p>
              <p className="text-[11px] text-slate-500">
                LightGBM with 10 Boruta-Selected Features. Model estimates require physician confirmation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-slate-500 text-[11px]">
            <span>Stratified 70/15/15 Split</span>
            <span>&bull;</span>
            <span>Synthetic Demo Records</span>
            <span>&bull;</span>
            <span className="text-slate-400 font-mono">FastAPI + Vite React</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
