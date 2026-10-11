import {
  Activity,
  ArrowRight,
  Brain,
  Clock,
  FileCheck2,
  FileText,
  FlaskConical,
  RotateCcw,
  ShieldAlert,
  Stethoscope,
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
import type { AssessmentResult } from '../api/client'

interface PredictionResultsProps {
  result: AssessmentResult | null
  onNavigate: (tabId: 'assessment' | 'explain' | 'history') => void
  onExportReport?: (id: string) => void
}

const CLASS_THEMES: Record<
  string,
  {
    color: string
    badge: string
    bgGradient: string
    border: string
    description: string
    riskTier: 'Low Risk' | 'Moderate Risk' | 'High Clinical Risk' | 'Critical Alert'
  }
> = {
  Normal: {
    color: '#10b981',
    badge: 'Physiological / Healthy',
    bgGradient: 'from-emerald-950/40 via-slate-900 to-slate-950',
    border: 'border-emerald-500/40',
    description: 'Biomarkers and symptomatology are within normal physiological bounds without indications of acute hepatic injury.',
    riskTier: 'Low Risk',
  },
  'Fatty Liver': {
    color: '#f59e0b',
    badge: 'Steatotic Liver Disease (NAFLD/MASLD)',
    bgGradient: 'from-amber-950/40 via-slate-900 to-slate-950',
    border: 'border-amber-500/40',
    description: 'Elevated transaminases and metabolic presentation consistent with hepatic steatosis. Lifestyle and dietary intervention indicated.',
    riskTier: 'Moderate Risk',
  },
  'Alcoholic Liver Disease': {
    color: '#f97316',
    badge: 'Alcohol-Related Liver Disease (ALD)',
    bgGradient: 'from-orange-950/40 via-slate-900 to-slate-950',
    border: 'border-orange-500/40',
    description: 'Characteristic transaminase skew (AST > ALT predominance) with conjugated bilirubin rise reflecting toxic alcohol injury.',
    riskTier: 'High Clinical Risk',
  },
  Cirrhosis: {
    color: '#ef4444',
    badge: 'Advanced Cirrhosis / Portal HTN',
    bgGradient: 'from-rose-950/40 via-slate-900 to-slate-950',
    border: 'border-rose-500/40',
    description: 'Biochemical pattern of decompensated hepatic insufficiency with hypoalbuminemia, hyperbilirubinemia, thrombocytopenia, and ascites.',
    riskTier: 'Critical Alert',
  },
  'Hepatitis B': {
    color: '#3b82f6',
    badge: 'Viral Hepatitis B Infection',
    bgGradient: 'from-blue-950/40 via-slate-900 to-slate-950',
    border: 'border-blue-500/40',
    description: 'Substantial hepatocellular transaminitis with jaundice and systemic fatigue indicative of acute or reactivated HBV infection.',
    riskTier: 'High Clinical Risk',
  },
  'Hepatitis C': {
    color: '#8b5cf6',
    badge: 'Viral Hepatitis C Infection',
    bgGradient: 'from-violet-950/40 via-slate-900 to-slate-950',
    border: 'border-violet-500/40',
    description: 'Persistent transaminase elevation with dark urine and constitutional symptoms consistent with chronic HCV viremia.',
    riskTier: 'High Clinical Risk',
  },
}

export function PredictionResultsPage({
  result,
  onNavigate,
  onExportReport,
}: PredictionResultsProps) {
  if (!result) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-12 text-center max-w-xl mx-auto my-12 backdrop-blur-sm animate-in fade-in">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-4">
          <FileCheck2 className="h-7 w-7" />
        </div>
        <h2 className="font-display text-xl font-bold text-white">No Assessment Evaluated Yet</h2>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed">
          Please complete the patient biomarker form on Page 02 to run the LightGBM multi-class model and review 6-class probability outputs.
        </p>
        <button
          onClick={() => onNavigate('assessment')}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500"
        >
          <Stethoscope className="h-4 w-4" />
          <span>Go to Patient Assessment (02)</span>
        </button>
      </div>
    )
  }

  const {
    assessment_id,
    timestamp,
    patient_alias,
    predicted_class_name,
    confidence,
    probabilities,
    imputed_features,
    inputs,
    clinical_disclaimer,
  } = result

  const theme = CLASS_THEMES[predicted_class_name] || {
    color: '#06b6d4',
    badge: 'Assessed Condition',
    bgGradient: 'from-slate-900 to-slate-950',
    border: 'border-cyan-500/40',
    description: 'Model estimation based on the ten Boruta biomarkers.',
    riskTier: 'Moderate Risk',
  }

  // Sorted 6-class probabilities for chart & differential analysis
  const sortedClasses = Object.entries(probabilities)
    .map(([name, prob]) => ({
      name,
      prob: Number((prob * 100).toFixed(2)),
      rawProb: prob,
      color: CLASS_THEMES[name]?.color || '#06b6d4',
    }))
    .sort((a, b) => b.prob - a.prob)

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Breadcrumb & ID Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-800 bg-slate-950/60 text-xs">
        <div className="flex items-center gap-3">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400">
            Assessment ID: <strong className="font-mono text-cyan-400">{assessment_id}</strong>
          </span>
          <span className="text-slate-600">&bull;</span>
          <span className="text-slate-400">
            Patient: <strong className="text-white">{patient_alias}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <Clock className="h-3.5 w-3.5" />
          <span>{new Date(timestamp).toLocaleString()}</span>
        </div>
      </div>

      {/* Primary Highlight Card: Winning Class */}
      <div
        className={`relative overflow-hidden rounded-3xl border ${theme.border} bg-gradient-to-br ${theme.bgGradient} p-6 sm:p-8 shadow-2xl`}
      >
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span
                className="rounded-full px-3 py-1 text-xs font-bold border"
                style={{
                  backgroundColor: `${theme.color}20`,
                  color: theme.color,
                  borderColor: `${theme.color}40`,
                }}
              >
                {theme.badge}
              </span>
              <span className="rounded-full bg-slate-900/90 border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300">
                Priority: <strong className="text-white">{theme.riskTier}</strong>
              </span>
              {imputed_features.length > 0 && (
                <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-medium text-amber-300">
                  {imputed_features.length} Imputed Features
                </span>
              )}
            </div>

            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {predicted_class_name}
            </h1>

            <p className="mt-3 text-sm text-slate-300 max-w-2xl leading-relaxed">
              {theme.description}
            </p>
          </div>

          {/* Model Confidence Metric Card */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-950/80 border border-slate-800 p-6 sm:min-w-[240px] text-center shadow-lg">
            <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
              Model Confidence
            </span>
            <div className="mt-2 font-display text-4xl sm:text-5xl font-black text-white">
              {(confidence * 100).toFixed(1)}%
            </div>
            <span
              className="mt-2 text-xs font-bold uppercase tracking-wider"
              style={{ color: theme.color }}
            >
              Primary Prediction
            </span>
            <div className="w-full h-1.5 rounded-full bg-slate-800 mt-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${confidence * 100}%`,
                  backgroundColor: theme.color,
                }}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('explain')}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-indigo-500 transition-all active:scale-95"
            >
              <Brain className="h-4 w-4" />
              <span>Inspect with Explainable AI (SHAP)</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => onExportReport?.(assessment_id) || onNavigate('history')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-200 transition-colors"
            >
              <FileText className="h-4 w-4 text-cyan-400" />
              <span>Export Clinical Report</span>
            </button>
          </div>

          <button
            onClick={() => onNavigate('assessment')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Perform Another Assessment</span>
          </button>
        </div>
      </div>

      {/* Mandatory Clinical Disclaimer Alert */}
      <div className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-5 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-amber-300 uppercase tracking-wider">
              Clinical Decision Support — Model Estimate Notice (Not a Final Diagnosis)
            </h3>
            <p className="mt-1 text-xs text-amber-200/90 leading-relaxed">
              {clinical_disclaimer}
            </p>
            <p className="mt-2 text-[11px] text-slate-400">
              All statistical estimates must be reviewed in conjunction with physical examination, abdominal ultrasound/elastography, and confirmatory laboratory panels prior to clinical management decisions.
            </p>
          </div>
        </div>
      </div>

      {/* 6-Class Probability Distribution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Probability Chart */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-cyan-400" />
                Six-Class Probability Distribution
              </h2>
              <p className="text-xs text-slate-400">
                Full model posterior probabilities across all 6 diagnostic classifications
              </p>
            </div>
            <span className="text-xs font-mono text-cyan-400">Sum: 100.0%</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={sortedClasses}
                margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
              >
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  unit="%"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: '#e2e8f0', fontSize: 11 }}
                  width={150}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload
                      return (
                        <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 shadow-xl text-xs">
                          <p className="font-semibold text-white">{item.name}</p>
                          <p className="mt-1 font-mono text-cyan-400 font-bold">
                            Probability: {item.prob}%
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="prob" radius={[0, 6, 6, 0]}>
                  {sortedClasses.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Differential Ranking Cards */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-white mb-1">
              Differential Diagnosis Ranking
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Relative risk likelihood from highest to lowest class probability
            </p>

            <div className="space-y-2.5">
              {sortedClasses.map((item, idx) => (
                <div
                  key={item.name}
                  className={`rounded-xl border p-3 flex items-center justify-between text-xs transition-colors ${
                    idx === 0
                      ? 'border-cyan-500/40 bg-cyan-950/20 text-white font-semibold'
                      : 'border-slate-800/80 bg-slate-950/40 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-black ${
                        idx === 0
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </div>

                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-white">{item.prob}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Classifier: LightGBM GBDT</span>
            <span>Boruta: 10 Selected Features</span>
          </div>
        </div>
      </div>

      {/* Patient Input Biomarkers Review Panel */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm">
        <h2 className="font-display text-base font-bold text-white mb-1 flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-cyan-400" />
          Evaluated Input Biomarkers Review
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Clinical parameters utilized by the model for this patient assessment
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(inputs).map(([key, val]) => {
            const isImputed = imputed_features.includes(key)
            let formattedVal = String(val)
            let label = key
            let unit = ''

            if (key === 'AST') { label = 'AST'; unit = 'U/L' }
            else if (key === 'ALT') { label = 'ALT'; unit = 'U/L' }
            else if (key === 'Bilirubin') { label = 'Total Bilirubin'; unit = 'mg/dL' }
            else if (key === 'Albumin') { label = 'Albumin'; unit = 'g/dL' }
            else if (key === 'Platelets') { label = 'Platelets'; unit = '×10⁹/L' }
            else if (key === 'Sym_Jaundice') { label = 'Jaundice'; formattedVal = val === 1 ? 'Present' : 'Absent' }
            else if (key === 'Sym_Dark_Urine') { label = 'Dark Urine'; formattedVal = val === 1 ? 'Present' : 'Absent' }
            else if (key === 'Sym_Fatigue') { label = 'Fatigue'; formattedVal = val === 1 ? 'Present' : 'Absent' }
            else if (key === 'Sym_Ascites') { label = 'Ascites'; formattedVal = val === 1 ? 'Present' : 'Absent' }
            else if (key === 'Comorb_Diabetes') { label = 'Diabetes'; formattedVal = val === 1 ? 'Present' : 'Absent' }

            return (
              <div
                key={key}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium truncate">{label}</span>
                  {isImputed && (
                    <span className="rounded bg-amber-500/20 text-amber-300 px-1 text-[9px]">
                      Imputed
                    </span>
                  )}
                </div>
                <div className="mt-1.5 font-mono text-sm font-bold text-white">
                  {formattedVal} <span className="text-xs text-slate-400 font-normal">{unit}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
