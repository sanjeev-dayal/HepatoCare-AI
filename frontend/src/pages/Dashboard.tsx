import { useEffect, useState } from 'react'
import {
  Activity,
  ArrowRight,
  Award,
  BarChart2,
  Clock,
  Layers,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { api, type DashboardData, type RecentHistoryItem } from '../api/client'

interface DashboardProps {
  onNavigate: (tabId: 'assessment' | 'results' | 'explain' | 'performance' | 'history', selectedId?: string) => void
}

const CLASS_COLORS: Record<string, string> = {
  Normal: '#10b981', // emerald
  'Fatty Liver': '#f59e0b', // amber
  'Alcoholic Liver Disease': '#f97316', // orange
  Cirrhosis: '#ef4444', // rose
  'Hepatitis B': '#3b82f6', // blue
  'Hepatitis C': '#8b5cf6', // violet
}

export function DashboardPage({ onNavigate }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.dashboardStats()
      setData(res)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to connect to HepatoCare backend.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
        <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
        <p className="text-sm text-slate-400">Loading clinical analytics and model benchmarks...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 mb-3">
          <Activity className="h-6 w-6" />
        </div>
        <h3 className="font-display text-lg font-bold text-white">Connection Error</h3>
        <p className="mt-1 text-sm text-slate-300 max-w-md mx-auto">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry Connection
        </button>
      </div>
    )
  }

  const { total_assessments, disease_distribution, model_metrics, recent_history } = data

  const distributionChartData = Object.entries(disease_distribution).map(([name, count]) => ({
    name,
    count,
    color: CLASS_COLORS[name] || '#06b6d4',
  }))

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 text-xs font-medium text-cyan-300 mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span>HepatoCare AI Clinical Dashboard &bull; Page 01</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Liver Disease Clinical Intelligence
            </h1>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              Real-time multi-class assessment platform powered by tuned LightGBM trained on 10 Boruta-selected biomarkers. Evaluated with 88.40% validation accuracy and 85.50% macro-F1 across 6 liver pathologies.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('assessment')}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 transition-all active:scale-95"
            >
              <Stethoscope className="h-4 w-4" />
              <span>Start Assessment</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => onNavigate('performance')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-slate-700/80 transition-colors"
            >
              <BarChart2 className="h-4 w-4 text-cyan-400" />
              <span>Model Comparison</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assessments */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Assessments</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold text-white">{total_assessments}</span>
            <span className="text-xs text-emerald-400 font-medium">Evaluations stored</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Includes synthetic cohort demos &amp; user predictions
          </p>
        </div>

        {/* Accuracy */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Model Accuracy</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold text-white">
              {(model_metrics.validation_accuracy * 100).toFixed(2)}%
            </span>
            <span className="text-xs text-emerald-400 font-medium">+4.57% vs FT-Trans.</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Test: {(model_metrics.test_accuracy * 100).toFixed(2)}% (10,200 samples)
          </p>
        </div>

        {/* Macro-F1 */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Macro-F1 Score</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold text-white">
              {(model_metrics.validation_macro_f1 * 100).toFixed(2)}%
            </span>
            <span className="text-xs text-indigo-400 font-medium">+7.27% vs baseline</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Balanced multi-class performance metric
          </p>
        </div>

        {/* Balanced Accuracy */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Balanced Accuracy</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold text-white">
              {(model_metrics.validation_balanced_accuracy * 100).toFixed(2)}%
            </span>
            <span className="text-xs text-amber-400 font-medium">+6.44% vs baseline</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Mitigates class imbalance across 6 targets
          </p>
        </div>
      </div>

      {/* Disease Distribution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribution Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-cyan-400" />
                Disease Distribution Across Six Classes
              </h2>
              <p className="text-xs text-slate-400">
                Patient cohort breakdown across all assessed liver disease types
              </p>
            </div>
            <button
              onClick={() => onNavigate('assessment')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
            >
              Assess patient <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={distributionChartData}
                margin={{ top: 10, right: 10, left: -15, bottom: 25 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  angle={-15}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload
                      return (
                        <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 shadow-xl text-xs">
                          <p className="font-semibold text-white">{item.name}</p>
                          <p className="text-slate-400 mt-1">
                            Assessments: <strong className="text-cyan-400">{item.count}</strong>
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {distributionChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Color Key Grid */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 pt-4 border-t border-slate-800/80">
            {distributionChartData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-300 truncate">{item.name}</span>
                <span className="ml-auto font-semibold text-white">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Model Spec & Boruta Summary Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">
              <Layers className="h-4 w-4" />
              <span>Production Pipeline</span>
            </div>
            <h3 className="font-display text-lg font-bold text-white">
              Boruta Feature Selection
            </h3>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              Filtered from 33 raw clinical features down to exactly 10 all-relevant biomarkers using Boruta with shadow feature permutation.
            </p>

            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">Laboratory Markers</span>
                <span className="font-semibold text-cyan-300">AST, ALT, Bilirubin, Albumin, Platelets</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">Clinical Symptoms</span>
                <span className="font-semibold text-amber-300">Jaundice, Dark Urine, Fatigue, Ascites</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">Comorbidity</span>
                <span className="font-semibold text-rose-300">Diabetes Mellitus</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-400">Verified in <code className="text-cyan-400 font-mono">load.py</code></span>
            <button
              onClick={() => onNavigate('explain')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
            >
              Explore SHAP <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Assessment History */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-400" />
              Recent Assessment History
            </h2>
            <p className="text-xs text-slate-400">
              Latest evaluations with predicted pathology and model confidence
            </p>
          </div>
          <button
            onClick={() => onNavigate('history')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
          >
            View all ({total_assessments}) <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/40 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-3">Assessment ID</th>
                <th className="py-3 px-3">Patient Alias</th>
                <th className="py-3 px-3">Predicted Class</th>
                <th className="py-3 px-3">Model Confidence</th>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recent_history.map((item: RecentHistoryItem) => {
                const color = CLASS_COLORS[item.predicted_class_name] || '#06b6d4'
                return (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-cyan-400">{item.id}</td>
                    <td className="py-3 px-3 font-medium text-white">{item.patient_alias}</td>
                    <td className="py-3 px-3">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border"
                        style={{
                          backgroundColor: `${color}15`,
                          color: color,
                          borderColor: `${color}30`,
                        }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                        {item.predicted_class_name}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${item.confidence * 100}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                        <span className="font-semibold text-slate-200">
                          {(item.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {new Date(item.timestamp).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onNavigate('history', item.id)}
                        className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition-colors"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
