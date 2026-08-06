import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area,
} from 'recharts'
import { api, type CorrelationData, type DistributionData, type CategoricalData } from '../api/client'
import { CorrelationHeatmap } from '../components/CorrelationHeatmap'
import { ErrorState, LoadingState } from './Overview'

const COLORS = ['#06b6d4', '#8b5cf6', '#f43f5e', '#f59e0b', '#10b981', '#6366f1', '#ec4899']

export function EDAPage() {
  const [correlation, setCorrelation] = useState<CorrelationData | null>(null)
  const [distributions, setDistributions] = useState<DistributionData | null>(null)
  const [categorical, setCategorical] = useState<CategoricalData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.correlation(), api.distributions(), api.categorical()])
      .then(([c, d, cat]) => {
        setCorrelation(c)
        setDistributions(d)
        setCategorical(cat)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingState />
  if (error || !correlation || !distributions || !categorical) {
    return <ErrorState message={error ?? 'Failed to load EDA data'} />
  }

  const distKeys = Object.keys(distributions)

  return (
    <div className="space-y-8">
      <div className="card p-6">
        <h2 className="section-title mb-2">Correlation Matrix</h2>
        <p className="mb-6 text-sm text-slate-500">Key numeric feature relationships</p>
        <CorrelationHeatmap columns={correlation.columns} matrix={correlation.matrix} />
      </div>

      <div>
        <h2 className="section-title mb-4">Numeric Distributions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {distKeys.map((col, idx) => {
            const chartData = distributions[col].bins.map((bin, i) => ({
              bin: bin.toFixed(1),
              count: distributions[col].counts[i],
            }))
            const color = COLORS[idx % COLORS.length]
            return (
              <div key={col} className="card p-4">
                <h3 className="mb-2 text-sm font-semibold text-slate-700">{col}</h3>
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id={`grad-${col}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="bin" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 9 }} width={32} />
                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                    <Area type="monotone" dataKey="count" stroke={color} fill={`url(#grad-${col})`} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <h2 className="section-title mb-4">Categorical Counts</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          {Object.entries(categorical).map(([col, counts], idx) => {
            const chartData = Object.entries(counts).map(([name, value]) => ({
              name: name.length > 18 ? `${name.slice(0, 16)}…` : name,
              fullName: name,
              count: value,
            }))
            return (
              <div key={col} className="card p-5">
                <h3 className="mb-4 text-sm font-semibold text-slate-800">{col.replace(/_/g, ' ')}</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(v: number) => [v, 'Count']}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                      contentStyle={{ borderRadius: 10, fontSize: 12 }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={COLORS[(idx + i) % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
