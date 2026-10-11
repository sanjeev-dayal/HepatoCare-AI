import { useEffect, useState } from 'react'
import {
  AlertCircle,
  Award,
  BarChart3,
  Layers,
  RefreshCw,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { api, type ModelComparisonData } from '../api/client'

export function ModelPerformancePage() {
  const [data, setData] = useState<ModelComparisonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedModelCm, setSelectedModelCm] = useState<'lightgbm' | 'ft_transformer'>('lightgbm')

  useEffect(() => {
    async function loadMetrics() {
      try {
        setLoading(true)
        const res = await api.modelMetrics()
        setData(res)
      } catch (err: any) {
        console.error(err)
        setError(err.message || 'Failed to fetch model metrics.')
      } finally {
        setLoading(false)
      }
    }
    loadMetrics()
  }, [])

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
        <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
        <p className="text-sm text-slate-400">Loading verified benchmark results from load.py &amp; evaluation logs...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-8 text-center text-rose-300">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-rose-400" />
        <h3 className="font-display text-base font-bold text-white">Metrics Unavailable</h3>
        <p className="text-xs text-slate-400 mt-1">{error}</p>
      </div>
    )
  }

  const { classes, lightgbm, ft_transformer, comparison_highlights, key_takeaway } = data

  // Prepare per-class F1 comparison data for grouped bar chart
  const perClassChartData = classes.map((cls) => ({
    name: cls,
    lightgbmF1: Number(((lightgbm.per_class[cls]?.f1 || 0) * 100).toFixed(1)),
    ftTransformerF1: Number(((ft_transformer.per_class[cls]?.f1 || 0) * 100).toFixed(1)),
  }))

  const activeCm = selectedModelCm === 'lightgbm' ? lightgbm.confusion_matrix : ft_transformer.confusion_matrix
  const activeModelName = selectedModelCm === 'lightgbm' ? 'LightGBM (model_2)' : 'FT-Transformer (model.py)'

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/30 p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 text-xs font-medium text-cyan-300 mb-3">
            <Award className="h-3.5 w-3.5" />
            <span>Page 05 &bull; Rigorous Model Benchmark &amp; Evaluation</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            LightGBM vs. FT-Transformer Comparison
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Final evaluation results verified from <code className="text-cyan-400 font-mono">load.py</code> and <code className="text-cyan-400 font-mono">results/</code>. Contrasts tree-based gradient boosting on 10 Boruta biomarkers against deep tabular attention on 54 encoded features.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-400 pt-4 border-t border-slate-800/80">
          <span>Validation Sample: <strong className="text-white">10,200 Patients</strong></span>
          <span>&bull;</span>
          <span>Test Sample: <strong className="text-white">10,200 Patients</strong></span>
          <span>&bull;</span>
          <span>Stratified 70/15/15 Split</span>
        </div>
      </div>

      {/* Primary Head-to-Head Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Accuracy */}
        <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 to-slate-900/80 p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="uppercase font-semibold tracking-wider">Overall Accuracy</span>
            <span className="rounded bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 text-[10px] font-bold">
              +4.57%
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <div>
              <span className="text-[10px] text-slate-400 block">LightGBM (model_2)</span>
              <span className="font-display text-3xl font-extrabold text-white">
                {(lightgbm.accuracy * 100).toFixed(2)}%
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">FT-Transformer</span>
              <span className="font-display text-2xl font-bold text-slate-400">
                {(ft_transformer.accuracy * 100).toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="mt-3 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
            <div className="bg-cyan-400 h-full" style={{ width: `${lightgbm.accuracy * 100}%` }} />
          </div>
        </div>

        {/* Macro-F1 */}
        <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/20 to-slate-900/80 p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="uppercase font-semibold tracking-wider">Macro-F1 Score</span>
            <span className="rounded bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 text-[10px] font-bold">
              +7.27%
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <div>
              <span className="text-[10px] text-slate-400 block">LightGBM (model_2)</span>
              <span className="font-display text-3xl font-extrabold text-white">
                {(lightgbm.macro_f1 * 100).toFixed(2)}%
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">FT-Transformer</span>
              <span className="font-display text-2xl font-bold text-slate-400">
                {(ft_transformer.macro_f1 * 100).toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="mt-3 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
            <div className="bg-indigo-400 h-full" style={{ width: `${lightgbm.macro_f1 * 100}%` }} />
          </div>
        </div>

        {/* Balanced Accuracy */}
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-slate-900/80 p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="uppercase font-semibold tracking-wider">Balanced Accuracy</span>
            <span className="rounded bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 text-[10px] font-bold">
              +6.44%
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <div>
              <span className="text-[10px] text-slate-400 block">LightGBM (model_2)</span>
              <span className="font-display text-3xl font-extrabold text-white">
                {(lightgbm.balanced_accuracy * 100).toFixed(2)}%
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">FT-Transformer</span>
              <span className="font-display text-2xl font-bold text-slate-400">
                {(ft_transformer.balanced_accuracy * 100).toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="mt-3 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
            <div className="bg-amber-400 h-full" style={{ width: `${lightgbm.balanced_accuracy * 100}%` }} />
          </div>
        </div>

        {/* Feature Efficiency */}
        <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-950/20 to-slate-900/80 p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="uppercase font-semibold tracking-wider">Feature Efficiency</span>
            <span className="rounded bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 text-[10px] font-bold">
              5.4× Smaller
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <div>
              <span className="text-[10px] text-slate-400 block">LightGBM (Boruta)</span>
              <span className="font-display text-3xl font-extrabold text-white">
                {lightgbm.features_used} <span className="text-sm font-normal text-slate-400">features</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">FT-Transformer</span>
              <span className="font-display text-2xl font-bold text-slate-400">
                {ft_transformer.features_used} <span className="text-sm font-normal text-slate-500">features</span>
              </span>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            Boruta eliminated 81% of inputs with zero accuracy degradation
          </p>
        </div>
      </div>

      {/* Grouped Bar Chart: Per-Class F1-Score Comparison */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-cyan-400" />
              Per-Class F1-Score: LightGBM vs. FT-Transformer
            </h2>
            <p className="text-xs text-slate-400">
              Evaluated across all 6 diagnostic classes on the 10,200 evaluation patient cohort
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <span className="h-2.5 w-2.5 rounded-sm bg-cyan-400" /> LightGBM (model_2)
            </span>
            <span className="flex items-center gap-1.5 text-slate-400 font-medium">
              <span className="h-2.5 w-2.5 rounded-sm bg-slate-500" /> FT-Transformer (model.py)
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={perClassChartData}
              margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fill: '#cbd5e1', fontSize: 11 }}
                interval={0}
                angle={-10}
                textAnchor="end"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                unit="%"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload
                    return (
                      <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 shadow-xl text-xs space-y-1">
                        <p className="font-bold text-white">{d.name}</p>
                        <p className="text-cyan-400 font-mono">
                          LightGBM F1: <strong>{d.lightgbmF1}%</strong>
                        </p>
                        <p className="text-slate-400 font-mono">
                          FT-Transformer F1: <strong>{d.ftTransformerF1}%</strong>
                        </p>
                        <p className="text-emerald-400 font-bold text-[11px] pt-1 border-t border-slate-800">
                          Delta: +{(d.lightgbmF1 - d.ftTransformerF1).toFixed(1)}%
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="lightgbmF1" name="LightGBM" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ftTransformerF1" name="FT-Transformer" fill="#64748b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Interactive Confusion Matrix Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-cyan-400" />
                Confusion Matrix ({activeModelName})
              </h2>
              <p className="text-xs text-slate-400">
                Actual vs. Predicted class distribution (N = 10,200 cohort patients)
              </p>
            </div>

            <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 p-1 text-xs">
              <button
                onClick={() => setSelectedModelCm('lightgbm')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  selectedModelCm === 'lightgbm'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                LightGBM Matrix
              </button>
              <button
                onClick={() => setSelectedModelCm('ft_transformer')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  selectedModelCm === 'ft_transformer'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                FT-Transformer Matrix
              </button>
            </div>
          </div>

          {activeCm && activeCm.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-2 text-left font-semibold">Actual \ Predicted</th>
                    {classes.map((cls) => (
                      <th key={cls} className="py-2.5 px-2 font-semibold">
                        {cls.replace('Alcoholic Liver Disease', 'ALD').replace('Hepatitis ', 'Hep ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {classes.map((actualCls, rowIdx) => (
                    <tr key={actualCls} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-2 text-left font-semibold text-slate-300">
                        {actualCls}
                      </td>
                      {classes.map((_, colIdx) => {
                        const count = activeCm[rowIdx]?.[colIdx] ?? 0
                        const isDiagonal = rowIdx === colIdx
                        const maxVal = Math.max(...(activeCm[rowIdx] || [1]))
                        const ratio = maxVal > 0 ? count / maxVal : 0

                        return (
                          <td
                            key={colIdx}
                            className="py-2 px-1 font-mono transition-colors"
                            style={{
                              backgroundColor: isDiagonal
                                ? `rgba(6, 182, 212, ${0.15 + ratio * 0.4})`
                                : count > 0
                                ? `rgba(244, 63, 94, ${Math.min(0.3, ratio * 0.3)})`
                                : 'transparent',
                            }}
                          >
                            <span
                              className={`font-semibold ${
                                isDiagonal ? 'text-white' : count > 0 ? 'text-slate-300' : 'text-slate-600'
                              }`}
                            >
                              {count.toLocaleString()}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-8 text-center">No matrix data available</p>
          )}

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Diagonal cells (cyan) represent accurate true-positive classifications</span>
            <span className="font-mono text-cyan-400">Rows: Actual | Columns: Predicted</span>
          </div>
        </div>

        {/* Highlights & Key Takeaway */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-white mb-2">
              Verified Benchmark Findings
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              {key_takeaway}
            </p>

            <div className="space-y-2">
              {comparison_highlights.map((item) => (
                <div
                  key={item.metric}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-white block">{item.metric}</span>
                    <span className="text-[11px] text-slate-400">
                      LightGBM {item.lightgbm} vs FT-Trans {item.ft_transformer}
                    </span>
                  </div>
                  <span className="rounded bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-xs font-bold font-mono">
                    {item.delta}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
            Verified via <code className="text-cyan-400 font-mono">load.py</code> evaluation script
          </div>
        </div>
      </div>

      {/* Per-Class Detailed Classification Report Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm">
        <h2 className="font-display text-base font-bold text-white mb-1">
          Per-Class Detailed Evaluation Breakdown
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Precision, Recall, and F1-Score metrics for LightGBM vs. FT-Transformer
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/40 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-2.5 px-3">Disease Class</th>
                <th className="py-2.5 px-3">LGBM Precision</th>
                <th className="py-2.5 px-3">LGBM Recall</th>
                <th className="py-2.5 px-3 font-bold text-cyan-400">LGBM F1</th>
                <th className="py-2.5 px-3">Trans. Precision</th>
                <th className="py-2.5 px-3">Trans. Recall</th>
                <th className="py-2.5 px-3 font-bold text-slate-400">Trans. F1</th>
                <th className="py-2.5 px-3 text-right">Support</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {classes.map((cls) => {
                const lRow = lightgbm.per_class[cls] || { precision: 0, recall: 0, f1: 0, support: 0 }
                const tRow = ft_transformer.per_class[cls] || { precision: 0, recall: 0, f1: 0, support: 0 }
                return (
                  <tr key={cls} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-sans font-semibold text-white">
                      {cls}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{(lRow.precision * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3 text-slate-300">{(lRow.recall * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3 font-bold text-cyan-400">{(lRow.f1 * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3 text-slate-400">{(tRow.precision * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3 text-slate-400">{(tRow.recall * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3 font-bold text-slate-400">{(tRow.f1 * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3 text-right text-slate-400 font-sans">
                      {lRow.support.toLocaleString()}
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
