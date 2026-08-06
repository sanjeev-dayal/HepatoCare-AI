import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { api, type FeatureRankingData, type FeatureStat } from '../api/client'
import { ErrorState, LoadingState } from './Overview'

export function FeatureSelectionPage() {
  const [ranking, setRanking] = useState<FeatureRankingData | null>(null)
  const [stats, setStats] = useState<FeatureStat[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.featureRanking(), api.featureStats()])
      .then(([r, s]) => {
        setRanking(r)
        setStats(s)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingState />
  if (error || !ranking || !stats) {
    return <ErrorState message={error ?? 'Failed to load feature data'} />
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <h2 className="section-title">Selected Features</h2>
            <span className="ml-auto rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
              {ranking.selected.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ranking.selected.map((f) => (
              <span
                key={f}
                className="rounded-lg bg-gradient-to-r from-emerald-50 to-brand-50 px-3 py-1.5 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200/60"
              >
                {f.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="mb-4 flex items-center gap-2">
            <XCircle className="h-5 w-5 text-slate-400" />
            <h2 className="section-title">Rejected Features</h2>
            <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
              {ranking.rejected.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ranking.rejected.map((f) => (
              <span
                key={f}
                className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-500 ring-1 ring-slate-200"
              >
                {f.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="section-title mb-4">Boruta Feature Ranking</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                <th className="px-4 py-3 font-semibold">Feature</th>
                <th className="px-4 py-3 font-semibold">Rank</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {ranking.ranking.map((row) => (
                <tr key={row.Feature} className="border-b border-slate-50 hover:bg-brand-50/20">
                  <td className="px-4 py-2.5 font-medium text-slate-700">{row.Feature}</td>
                  <td className="px-4 py-2.5 text-slate-600">{row.Rank}</td>
                  <td className="px-4 py-2.5">
                    {row.Selected ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> Selected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                        <XCircle className="h-3 w-3" /> Rejected
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="section-title mb-4">Selected Feature Statistics</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                <th className="px-3 py-2 font-semibold">Feature</th>
                <th className="px-3 py-2 font-semibold">Mean</th>
                <th className="px-3 py-2 font-semibold">Std</th>
                <th className="px-3 py-2 font-semibold">Min</th>
                <th className="px-3 py-2 font-semibold">25%</th>
                <th className="px-3 py-2 font-semibold">50%</th>
                <th className="px-3 py-2 font-semibold">75%</th>
                <th className="px-3 py-2 font-semibold">Max</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((row) => (
                <tr key={row.feature} className="border-b border-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-700">{row.feature}</td>
                  <td className="px-3 py-2 text-slate-600">{row.mean?.toFixed(2)}</td>
                  <td className="px-3 py-2 text-slate-600">{row.std?.toFixed(2)}</td>
                  <td className="px-3 py-2 text-slate-600">{row.min?.toFixed(2)}</td>
                  <td className="px-3 py-2 text-slate-600">{row['25%']?.toFixed(2)}</td>
                  <td className="px-3 py-2 text-slate-600">{row['50%']?.toFixed(2)}</td>
                  <td className="px-3 py-2 text-slate-600">{row['75%']?.toFixed(2)}</td>
                  <td className="px-3 py-2 text-slate-600">{row.max?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
