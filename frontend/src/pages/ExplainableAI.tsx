import { useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Brain,
  Flame,
  Layers,
  Maximize2,
  RefreshCw,
  Stethoscope,
  TrendingUp,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'
import {
  api,
  type AssessmentResult,
  type GlobalExplanationData,
  type ShapContribution,
  type StoredAssessment,
} from '../api/client'

interface ExplainableAIProps {
  currentAssessment: AssessmentResult | null
  onNavigate: (tabId: 'assessment' | 'results' | 'performance') => void
}

export function ExplainableAIPage({ currentAssessment, onNavigate }: ExplainableAIProps) {
  const [activeMode, setActiveMode] = useState<'individual' | 'global'>('individual')
  const [globalData, setGlobalData] = useState<GlobalExplanationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Recent assessments for switching cases
  const [historyList, setHistoryList] = useState<StoredAssessment[]>([])
  const [selectedCaseId, setSelectedCaseId] = useState<string>(
    currentAssessment?.assessment_id || ''
  )
  const [activeCase, setActiveCase] = useState<StoredAssessment | AssessmentResult | null>(
    currentAssessment
  )

  // SHAP plot view toggle
  const [shapPlotType, setShapPlotType] = useState<'summary' | 'bar'>('summary')
  const [lightboxOpen, setLightboxOpen] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [gRes, hRes] = await Promise.all([
          api.globalExplanation(),
          api.assessments(),
        ])
        setGlobalData(gRes)
        setHistoryList(hRes.assessments)

        // If no active assessment is passed from props, select the first from history
        if (!currentAssessment && hRes.assessments.length > 0) {
          setActiveCase(hRes.assessments[0])
          setSelectedCaseId(hRes.assessments[0].id)
        }
      } catch (err: any) {
        console.error(err)
        setError(err.message || 'Failed to load explainable AI data.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [currentAssessment])

  const handleSelectCase = async (id: string) => {
    setSelectedCaseId(id)
    try {
      const caseItem = await api.assessmentById(id)
      setActiveCase(caseItem)
    } catch (err) {
      console.error(err)
    }
  }

  // Derive SHAP list for the selected case
  const caseShapList: ShapContribution[] =
    (activeCase as any)?.shap_contributions || []

  // Format local SHAP for waterfall/diverging chart
  const localShapChartData = caseShapList.map((item) => ({
    feature: item.label || item.feature,
    rawKey: item.feature,
    value: item.shap_value,
    patientVal: item.value,
    unit: item.unit,
    color: item.shap_value >= 0 ? '#ef4444' : '#10b981', // positive increases risk (+), negative reduces (-)
  }))

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 text-xs font-medium text-indigo-300 mb-3">
              <Brain className="h-3.5 w-3.5" />
              <span>Page 04 &bull; Explainable Artificial Intelligence (XAI)</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Model Interpretability &amp; SHAP Explanations
            </h1>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              Transparent clinical decision support powered by <strong>TreeSHAP (Shapley Additive Explanations)</strong> and <strong>Boruta Feature Importance</strong>. Inspect individual biomarker impact or review global model feature attribution.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center rounded-2xl bg-slate-950/90 border border-slate-800 p-1.5 shrink-0">
            <button
              onClick={() => setActiveMode('individual')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                activeMode === 'individual'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Stethoscope className="h-3.5 w-3.5" />
              <span>Individual Patient Explanation</span>
            </button>
            <button
              onClick={() => setActiveMode('global')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                activeMode === 'global'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Global Model Interpretability</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-72 flex-col items-center justify-center gap-4 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
          <p className="text-sm text-slate-400">Loading TreeSHAP explainer values and global rankings...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-6 text-center text-rose-300">
          <AlertCircle className="h-6 w-6 mx-auto mb-2 text-rose-400" />
          <p className="text-sm">{error}</p>
        </div>
      ) : activeMode === 'individual' ? (
        /* ======================== MODE 1: INDIVIDUAL PREDICTION EXPLANATION ======================== */
        <div className="space-y-6">
          {/* Patient Case Selector Toolbar */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 backdrop-blur-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-slate-400 font-medium">Selected Case:</span>
              <select
                value={selectedCaseId}
                onChange={(e) => handleSelectCase(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                {historyList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} — {c.patient_alias} ({c.predicted_class_name})
                  </option>
                ))}
              </select>
            </div>

            {activeCase && (
              <div className="flex items-center gap-3">
                <span className="text-slate-400">Predicted Pathology:</span>
                <span className="font-bold text-white px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">
                  {activeCase.predicted_class_name} ({((activeCase.confidence || 0) * 100).toFixed(1)}%)
                </span>
                <button
                  onClick={() => onNavigate('results')}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                >
                  View in Results &rarr;
                </button>
              </div>
            )}
          </div>

          {/* Local SHAP Waterfall / Diverging Bar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-cyan-400" />
                    Feature Contribution to Prediction (SHAP Values)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Red bars (+) increased probability toward <strong>{activeCase?.predicted_class_name}</strong>; Green bars (-) exerted protective effect
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1.5 text-rose-400 font-medium">
                    <span className="h-2 w-2 rounded-full bg-rose-500" /> +Risk Driver
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> -Protective / Reducer
                  </span>
                </div>
              </div>

              {localShapChartData.length > 0 ? (
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={localShapChartData}
                      margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
                    >
                      <XAxis
                        type="number"
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        tickFormatter={(v) => (v > 0 ? `+${v}` : `${v}`)}
                      />
                      <YAxis
                        type="category"
                        dataKey="feature"
                        tick={{ fill: '#e2e8f0', fontSize: 11 }}
                        width={160}
                      />
                      <ReferenceLine x={0} stroke="#475569" strokeDasharray="3 3" />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload
                            return (
                              <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 shadow-xl text-xs">
                                <p className="font-semibold text-white">{d.feature}</p>
                                <p className="text-slate-400 mt-1">
                                  Patient Value: <strong className="text-white">{d.patientVal} {d.unit}</strong>
                                </p>
                                <p className="mt-1 font-mono font-bold" style={{ color: d.color }}>
                                  SHAP Impact: {d.value > 0 ? `+${d.value}` : d.value}
                                </p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                        {localShapChartData.map((entry, index) => (
                          <Cell key={`shap-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-xs text-slate-500">
                  SHAP values being computed by TreeExplainer...
                </div>
              )}
            </div>

            {/* Natural Language Decision Narrative */}
            <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">
                  <Brain className="h-4 w-4" />
                  <span>Clinical Rationale</span>
                </div>
                <h3 className="font-display text-base font-bold text-white mb-2">
                  Individual Prediction Explanation
                </h3>

                <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-4 text-xs text-slate-300 leading-relaxed space-y-3">
                  <p>
                    For <strong className="text-white">{activeCase?.patient_alias || 'this patient'}</strong>, the LightGBM classifier estimated a high probability of{' '}
                    <strong className="text-cyan-300">{activeCase?.predicted_class_name}</strong>.
                  </p>

                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <span className="font-semibold text-slate-200 block text-[11px] uppercase tracking-wider">
                      Key Decision Drivers:
                    </span>
                    {caseShapList.slice(0, 3).map((item) => (
                      <div key={item.feature} className="flex items-start gap-2 text-[11px]">
                        <span className="text-rose-400 font-bold mt-0.5">&bull;</span>
                        <span>
                          <strong className="text-slate-200">{item.label || item.feature}</strong> ({item.value} {item.unit}):{' '}
                          contributed <code className="text-cyan-400 font-mono font-bold">+{item.abs_importance}</code> to classification.
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                    Unlike black-box neural networks, TreeSHAP computes exact Shapley marginal contributions for each tree partition.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
                Lundberg et al. (Nature Machine Intelligence, 2020)
              </div>
            </div>
          </div>

          {/* Table of Feature Impact Breakdown */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm">
            <h3 className="font-display text-sm font-bold text-white mb-3">
              Comprehensive Feature-by-Feature SHAP Breakdown
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 bg-slate-950/40 text-[11px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3">Biomarker</th>
                    <th className="py-2.5 px-3">Patient Value</th>
                    <th className="py-2.5 px-3">SHAP Value</th>
                    <th className="py-2.5 px-3">Direction</th>
                    <th className="py-2.5 px-3">Clinical Interpretation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {caseShapList.map((item) => {
                    const isPositive = item.shap_value >= 0
                    return (
                      <tr key={item.feature} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-white">
                          {item.label || item.feature}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {item.value} {item.unit}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold">
                          <span className={isPositive ? 'text-rose-400' : 'text-emerald-400'}>
                            {isPositive ? `+${item.shap_value}` : item.shap_value}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              isPositive
                                ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                                : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                            }`}
                          >
                            {isPositive ? (
                              <>
                                <ArrowUpRight className="h-3 w-3" /> Promotes {activeCase?.predicted_class_name}
                              </>
                            ) : (
                              <>
                                <ArrowDownRight className="h-3 w-3" /> Protective / Decreases
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                          {item.feature === 'AST' && 'Hepatocellular necroinflammation marker'}
                          {item.feature === 'ALT' && 'Liver-specific transaminase elevation'}
                          {item.feature === 'Bilirubin' && 'Hepatic clearance and biliary function'}
                          {item.feature === 'Albumin' && 'Protein synthesis and chronic liver reserve'}
                          {item.feature === 'Platelets' && 'Portal hypertension / hypersplenism index'}
                          {item.feature === 'Sym_Jaundice' && 'Overt hyperbilirubinemia clinical sign'}
                          {item.feature === 'Sym_Ascites' && 'Decompensated portal pressure hallmark'}
                          {item.feature === 'Sym_Dark_Urine' && 'Conjugated hyperbilirubinuria sign'}
                          {item.feature === 'Sym_Fatigue' && 'Constitutional hepatic symptom'}
                          {item.feature === 'Comorb_Diabetes' && 'Metabolic predisposition to NAFLD'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ======================== MODE 2: GLOBAL MODEL EXPLAINABILITY ======================== */
        <div className="space-y-6">
          {/* Global Feature Importance Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                    <Flame className="h-4 w-4 text-cyan-400" />
                    Global Feature Importance (LightGBM Split Gain)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Cumulative split importance across all 2,000 gradient boosted trees
                  </p>
                </div>
                <span className="text-xs font-mono text-cyan-400">10 Boruta Features</span>
              </div>

              {globalData?.feature_importance ? (
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={globalData.feature_importance}
                      margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
                    >
                      <XAxis
                        type="number"
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="feature"
                        tick={{ fill: '#e2e8f0', fontSize: 11 }}
                        width={130}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload
                            return (
                              <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 shadow-xl text-xs">
                                <p className="font-semibold text-white">{d.label} ({d.feature})</p>
                                <p className="text-cyan-400 font-mono mt-1 font-bold">
                                  Importance Score: {d.importance.toLocaleString()}
                                </p>
                                <p className="text-slate-400 text-[10px] mt-0.5 capitalize">
                                  Category: {d.category}
                                </p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="importance" fill="#06b6d4" radius={[0, 6, 6, 0]}>
                        {globalData.feature_importance.map((_, index) => (
                          <Cell
                            key={`fi-${index}`}
                            fill={
                              index === 0
                                ? '#06b6d4'
                                : index < 5
                                ? '#3b82f6'
                                : index < 8
                                ? '#8b5cf6'
                                : '#ec4899'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : null}
            </div>

            {/* Methodology Overview */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm flex flex-col justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-white mb-2">
                  TreeSHAP &amp; Boruta Synergy
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {globalData?.explanation}
                </p>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <strong className="text-white block mb-0.5">1. Boruta Permutation Filtering</strong>
                    <span className="text-slate-400">
                      Eliminated noise features like occupation, physical activity, and sleep that lacked reproducible statistical signal against randomized shadow features.
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <strong className="text-white block mb-0.5">2. High Split Concentration</strong>
                    <span className="text-slate-400">
                      Top 5 biochemical markers (Bilirubin, ALT, Platelets, AST, Albumin) dictate initial tree splits, providing robust discrimination.
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
                LightGBM v2.0 &bull; 10 Selected Features
              </div>
            </div>
          </div>

          {/* High-Resolution SHAP Summary Plot Display */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                  <Brain className="h-4 w-4 text-cyan-400" />
                  SHAP Summary Plots for the Final LightGBM Model
                </h2>
                <p className="text-xs text-slate-400">
                  Computed directly from validation cohort predictions using <code className="text-cyan-400 font-mono">shap.TreeExplainer</code>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShapPlotType('summary')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    shapPlotType === 'summary'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Multi-Class Summary Plot
                </button>
                <button
                  onClick={() => setShapPlotType('bar')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    shapPlotType === 'bar'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  SHAP Bar Plot
                </button>
              </div>
            </div>

            <div className="relative rounded-2xl bg-white p-4 shadow-xl overflow-hidden flex items-center justify-center min-h-[350px]">
              <img
                src={shapPlotType === 'summary' ? '/shap_summary.png' : '/shap_bar.png'}
                alt="SHAP Summary Plot"
                className="max-h-[500px] w-auto object-contain cursor-pointer hover:opacity-95 transition-opacity"
                onClick={() => setLightboxOpen(true)}
              />
              <button
                onClick={() => setLightboxOpen(true)}
                className="absolute top-4 right-4 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white p-2 shadow-lg backdrop-blur-sm text-xs flex items-center gap-1.5"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Enlarge Plot</span>
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-400 text-center">
              Click to view high-resolution plot. Displays Shapley values across Normal, Fatty Liver, ALD, Cirrhosis, Hepatitis B, and Hepatitis C.
            </p>
          </div>
        </div>
      )}

      {/* Lightbox Modal for SHAP Plot */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative max-w-5xl w-full max-h-[90vh] bg-white rounded-3xl p-6 overflow-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
              <h3 className="font-display text-base font-bold text-slate-900">
                LightGBM TreeSHAP Multi-Class Summary Analysis
              </h3>
              <button
                onClick={() => setLightboxOpen(false)}
                className="rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                Close &times;
              </button>
            </div>
            <img
              src={shapPlotType === 'summary' ? '/shap_summary.png' : '/shap_bar.png'}
              alt="High-resolution SHAP Plot"
              className="w-full h-auto object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  )
}
