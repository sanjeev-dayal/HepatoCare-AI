import { Fragment, useEffect, useState } from 'react'
import { Sparkles, TrendingUp } from 'lucide-react'
import { api, type PredictFeature, type PredictResult, type ModelMetrics } from '../api/client'
import { ErrorState, LoadingState } from './Overview'

export function ModelDemoPage() {
  const [features, setFeatures] = useState<PredictFeature[]>([])
  const [values, setValues] = useState<Record<string, number>>({})
  const [result, setResult] = useState<PredictResult | null>(null)
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null)
  const [predicting, setPredicting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.predictSchema(), api.modelMetrics()])
      .then(([schema, m]) => {
        setFeatures(schema.features)
        const defaults: Record<string, number> = {}
        schema.features.forEach((f) => {
          defaults[f.name] = f.default
        })
        setValues(defaults)
        setMetrics(m)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handlePredict = async () => {
    setPredicting(true)
    setResult(null)
    try {
      const res = await api.predict(values)
      setResult(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Prediction failed')
    } finally {
      setPredicting(false)
    }
  }

  if (loading) return <LoadingState />
  if (error && !features.length) {
    return <ErrorState message={error} />
  }

  const reportRows = metrics
    ? Object.entries(metrics.classification_report).filter(
        ([, row]) => typeof row === 'object' && row !== null
      )
    : []

  const accuracy = typeof metrics?.classification_report.accuracy === 'number'
    ? metrics.classification_report.accuracy
    : 0

  const maxCm = metrics ? Math.max(...metrics.confusion_matrix.flat()) : 1

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="card p-6 lg:col-span-2">
          <h2 className="section-title mb-1">Predict Disease Type</h2>
          <p className="mb-6 text-sm text-slate-500">Enter patient feature values below</p>

          <div className="space-y-4 max-h-[520px] overflow-y-auto pr-2">
            {features.map((f) => (
              <div key={f.name}>
                <label className="mb-1 block text-sm font-medium text-slate-700">{f.label}</label>
                {f.type === 'binary' ? (
                  <select
                    value={values[f.name] ?? 0}
                    onChange={(e) => setValues({ ...values, [f.name]: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  >
                    <option value={0}>No (0)</option>
                    <option value={1}>Yes (1)</option>
                  </select>
                ) : (
                  <input
                    type="number"
                    min={f.min}
                    max={f.max}
                    step={(f.max - f.min) / 100 || 0.01}
                    value={values[f.name] ?? f.default}
                    onChange={(e) => setValues({ ...values, [f.name]: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handlePredict}
            disabled={predicting}
            className="btn-primary mt-6 w-full disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            {predicting ? 'Predicting…' : 'Predict Disease Type'}
          </button>

          {result && (
            <div className="mt-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-brand-50 p-5 ring-1 ring-emerald-200/60">
              <p className="text-sm font-medium text-emerald-700">Predicted disease type</p>
              <p className="mt-1 font-display text-2xl font-bold text-emerald-900">{result.label}</p>
            </div>
          )}
        </div>

        <div className="space-y-6 lg:col-span-3">
          {metrics && (
            <>
              <div className="card p-6">
                <div className="mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-violet-500" />
                  <h2 className="section-title">Model Quality</h2>
                  <span className="ml-auto rounded-full bg-violet-100 px-3 py-1 text-sm font-bold text-violet-700">
                    Accuracy: {(accuracy * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="px-2 py-2 font-semibold">Class</th>
                        <th className="px-2 py-2 font-semibold">Precision</th>
                        <th className="px-2 py-2 font-semibold">Recall</th>
                        <th className="px-2 py-2 font-semibold">F1</th>
                        <th className="px-2 py-2 font-semibold">Support</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportRows.map(([label, row]) => {
                        if (typeof row !== 'object') return null
                        return (
                        <tr key={label} className="border-b border-slate-50">
                          <td className="px-2 py-2 font-medium text-slate-700">{label}</td>
                          <td className="px-2 py-2">{row.precision.toFixed(3)}</td>
                          <td className="px-2 py-2">{row.recall.toFixed(3)}</td>
                          <td className="px-2 py-2">{row['f1-score'].toFixed(3)}</td>
                          <td className="px-2 py-2">{row.support}</td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card p-6">
                <h2 className="section-title mb-4">Confusion Matrix</h2>
                <div className="overflow-x-auto">
                  <div
                    className="inline-grid gap-1"
                    style={{ gridTemplateColumns: `100px repeat(${metrics.labels.length}, minmax(48px, 1fr))` }}
                  >
                    <div />
                    {metrics.labels.map((l) => (
                      <div key={l} className="px-1 py-2 text-center text-[10px] font-semibold text-slate-500 truncate">
                        {l.split(' ')[0]}
                      </div>
                    ))}
                    {metrics.confusion_matrix.map((row, ri) => (
                      <Fragment key={`cm-row-${ri}`}>
                        <div className="flex items-center text-[10px] font-semibold text-slate-500 truncate pr-2">
                          {metrics.labels[ri]?.split(' ')[0]}
                        </div>
                        {row.map((val, ci) => {
                          const intensity = val / maxCm
                          return (
                            <div
                              key={`${ri}-${ci}`}
                              className="flex items-center justify-center rounded-lg text-xs font-bold text-slate-800 aspect-square min-h-[40px]"
                              style={{
                                backgroundColor: `rgba(6, 182, 212, ${0.15 + intensity * 0.75})`,
                              }}
                            >
                              {val}
                            </div>
                          )
                        })}
                      </Fragment>
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-400">Rows: actual · Columns: predicted</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
