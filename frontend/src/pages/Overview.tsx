import { useEffect, useState } from 'react'
import { Database, Layers, AlertCircle, Target } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { api, type OverviewData } from '../api/client'
import { StatCard } from '../components/StatCard'

const CHART_COLORS = ['#06b6d4', '#8b5cf6', '#f43f5e', '#f59e0b', '#10b981', '#6366f1']

export function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.overview()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingState />
  if (error || !data) return <ErrorState message={error ?? 'Failed to load overview'} />

  const targetChart = Object.entries(data.target_distribution).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    count: value,
  }))

  const missingEntries = Object.entries(data.missing_values)
  const dtypeEntries = Object.entries(data.dtypes)

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Raw Dataset"
          value={`${data.raw_shape[0].toLocaleString()} rows`}
          subtitle={`${data.raw_shape[1]} columns`}
          icon={Database}
          accent="brand"
        />
        <StatCard
          title="Cleaned Dataset"
          value={`${data.cleaned_shape[0].toLocaleString()} rows`}
          subtitle={`${data.cleaned_shape[1]} columns`}
          icon={Layers}
          accent="violet"
        />
        <StatCard
          title="Missing Values"
          value={missingEntries.length}
          subtitle={missingEntries.length ? 'columns with gaps' : 'none found'}
          icon={AlertCircle}
          accent="amber"
        />
        <StatCard
          title="Disease Classes"
          value={targetChart.length}
          subtitle="target categories"
          icon={Target}
          accent="rose"
        />
      </div>

      <div className="card p-6">
        <h2 className="section-title mb-4">Target Distribution</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={targetChart} margin={{ top: 8, right: 8, left: 0, bottom: 60 }}>
            <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {targetChart.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="section-title mb-4">Data Types</h2>
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="pb-2 font-medium">Column</th>
                  <th className="pb-2 font-medium">Type</th>
                </tr>
              </thead>
              <tbody>
                {dtypeEntries.map(([col, dtype]) => (
                  <tr key={col} className="border-b border-slate-50">
                    <td className="py-2 font-medium text-slate-700">{col}</td>
                    <td className="py-2">
                      <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                        {dtype}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="section-title mb-4">Missing Values</h2>
          {missingEntries.length === 0 ? (
            <p className="text-sm text-emerald-600 font-medium">No missing values in raw data.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="pb-2 font-medium">Column</th>
                  <th className="pb-2 font-medium">Count</th>
                </tr>
              </thead>
              <tbody>
                {missingEntries.map(([col, count]) => (
                  <tr key={col} className="border-b border-slate-50">
                    <td className="py-2 font-medium text-slate-700">{col}</td>
                    <td className="py-2 text-accent-500 font-semibold">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="section-title mb-4">Raw Data Sample</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                {Object.keys(data.sample[0] ?? {}).slice(0, 10).map((col) => (
                  <th key={col} className="whitespace-nowrap px-3 py-2 font-semibold">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.sample.map((row, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-brand-50/30">
                  {Object.keys(data.sample[0] ?? {}).slice(0, 10).map((col) => (
                    <td key={col} className="whitespace-nowrap px-3 py-2 text-slate-600">
                      {String(row[col] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500" />
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="card p-8 text-center text-accent-500">
      <p className="font-medium">{message}</p>
      <p className="mt-2 text-sm text-slate-500">Make sure the FastAPI backend is running on port 8000.</p>
    </div>
  )
}

export { LoadingState, ErrorState }
