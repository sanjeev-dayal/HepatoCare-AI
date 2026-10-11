import { useEffect, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Database,
  FlaskConical,
  Info,
  RefreshCw,
  Sparkles,
  Stethoscope,
  TestTube2,
  User,
  Zap,
} from 'lucide-react'
import {
  api,
  type AssessmentPayload,
  type AssessmentResult,
  type PresetCase,
  type SchemaResponse,
} from '../api/client'

interface PatientAssessmentProps {
  onSuccess: (result: AssessmentResult) => void
}

export function PatientAssessmentPage({ onSuccess }: PatientAssessmentProps) {
  const [schema, setSchema] = useState<SchemaResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Patient metadata
  const [patientAlias, setPatientAlias] = useState('Patient-Demo-Alpha')
  const [patientAge, setPatientAge] = useState<number | ''>(52)
  const [patientGender, setPatientGender] = useState('Male')
  const [clinicalNotes, setClinicalNotes] = useState('Patient presenting for comprehensive hepatology assessment.')

  // Feature form values (null represents missing value)
  const [featureValues, setFeatureValues] = useState<Record<string, number | null>>({
    AST: 36.61,
    ALT: 38.34,
    Bilirubin: 1.01,
    Albumin: 3.99,
    Platelets: 257.0,
    Sym_Jaundice: 0,
    Sym_Dark_Urine: 0,
    Sym_Fatigue: 0,
    Sym_Ascites: 0,
    Comorb_Diabetes: 0,
  })

  // Load schema from backend
  useEffect(() => {
    async function loadSchema() {
      try {
        const res = await api.featuresSchema()
        setSchema(res)
      } catch (err: any) {
        console.error('Failed to load features schema:', err)
        setError('Could not fetch schema from backend. Using local defaults.')
      }
    }
    loadSchema()
  }, [])

  const handleNumericChange = (key: string, valStr: string) => {
    if (valStr.trim() === '') {
      setFeatureValues((prev) => ({ ...prev, [key]: null }))
    } else {
      const num = parseFloat(valStr)
      if (isNaN(num)) {
        setFeatureValues((prev) => ({ ...prev, [key]: null }))
      } else {
        const rounded = Math.round(num * 1000) / 1000
        setFeatureValues((prev) => ({ ...prev, [key]: rounded }))
      }
    }
  }

  const handleToggle = (key: string) => {
    setFeatureValues((prev) => ({
      ...prev,
      [key]: prev[key] === 1 ? 0 : 1,
    }))
  }

  const applyPreset = (preset: PresetCase) => {
    setFeatureValues(preset.values)
    setClinicalNotes(`Evaluated under preset protocol: ${preset.name}`)
  }

  const handleResetToMedians = () => {
    if (!schema) return
    setFeatureValues({ ...schema.medians })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const payload: AssessmentPayload = {
        patient_alias: patientAlias || 'Anonymous Patient',
        age: patientAge === '' ? undefined : Number(patientAge),
        gender: patientGender,
        notes: clinicalNotes,
        features: featureValues,
      }

      const result = await api.predict(payload)
      onSuccess(result)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Prediction failed. Check backend connectivity.')
    } finally {
      setSubmitting(false)
    }
  }

  const getLabStatus = (feature: string, val: number | null) => {
    if (val === null) return { text: 'Missing (Auto-Impute)', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' }
    if (feature === 'AST') {
      if (val > 40) return { text: 'Elevated (>40)', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' }
      if (val < 10) return { text: 'Low (<10)', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' }
      return { text: 'Normal (10-40)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' }
    }
    if (feature === 'ALT') {
      if (val > 56) return { text: 'Elevated (>56)', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' }
      if (val < 7) return { text: 'Low (<7)', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' }
      return { text: 'Normal (7-56)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' }
    }
    if (feature === 'Bilirubin') {
      if (val > 1.2) return { text: 'Elevated (>1.2)', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' }
      return { text: 'Normal (0.2-1.2)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' }
    }
    if (feature === 'Albumin') {
      if (val < 3.5) return { text: 'Hypoalbuminemia (<3.5)', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' }
      return { text: 'Normal (3.5-5.5)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' }
    }
    if (feature === 'Platelets') {
      if (val < 150) return { text: 'Thrombocytopenia (<150)', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' }
      return { text: 'Normal (150-450)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' }
    }
    return { text: 'In Range', color: 'text-slate-400 bg-slate-800 border-slate-700' }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/30 p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 text-xs font-medium text-cyan-300 mb-3">
            <Stethoscope className="h-3.5 w-3.5" />
            <span>Page 02 &bull; Clinical Assessment Input</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Patient Biomarker Assessment
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Enter the ten Boruta-selected clinical features categorized into <strong>Laboratory</strong>, <strong>Symptoms</strong>, and <strong>Comorbidity</strong>. Missing values are automatically detected and handled using training dataset medians.
          </p>
        </div>

        {/* Clinical Scenarios Presets */}
        {schema?.presets && (
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
              <Zap className="h-3.5 w-3.5 text-cyan-400" />
              <span>Quick Synthetic Case Presets:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {schema.presets.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="rounded-xl border border-slate-700 bg-slate-900/90 hover:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition-all hover:border-cyan-500/50 hover:text-white"
                >
                  <span className="font-semibold">{preset.badge}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={handleResetToMedians}
                className="rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Reset to Medians
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 p-4 text-xs text-rose-300 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 0: Demographics & Clinical Context */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-white">Subject Metadata &amp; Context</h2>
              <p className="text-xs text-slate-400">De-identified patient alias and clinical baseline</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Patient Identifier / Alias
              </label>
              <input
                type="text"
                value={patientAlias}
                onChange={(e) => setPatientAlias(e.target.value)}
                placeholder="e.g. Synthetic Case 102"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Age (years)
              </label>
              <input
                type="number"
                min="1"
                max="120"
                step="0.001"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 52"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Biological Sex
              </label>
              <select
                value={patientGender}
                onChange={(e) => setPatientGender(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Clinical Notes / Presentation
            </label>
            <input
              type="text"
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="e.g. Acute onset right upper quadrant discomfort with elevated transaminases"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Section 1: Laboratory Features (AST, ALT, Bilirubin, Albumin, Platelets) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <FlaskConical className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                  1. Laboratory Biomarkers
                  <span className="rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold px-2 py-0.5 border border-emerald-500/30">
                    5 Features
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Serum quantitative assays with reference physiological ranges
                </p>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <span className="text-[11px] text-slate-400">
                Imputation standard: <code className="text-cyan-400 font-mono">Cohort Medians</code>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* AST */}
            <LabInputCard
              label="AST (Aspartate Aminotransferase)"
              featureKey="AST"
              unit="U/L"
              refRange="10 – 40 U/L"
              min={5}
              max={600}
              step={0.001}
              median={schema?.medians?.AST || 36.61}
              value={featureValues.AST}
              status={getLabStatus('AST', featureValues.AST)}
              description="Released during hepatocellular or cardiac injury; key marker in De Ritis ratio (AST/ALT)."
              onChange={(val) => handleNumericChange('AST', val)}
            />

            {/* ALT */}
            <LabInputCard
              label="ALT (Alanine Aminotransferase)"
              featureKey="ALT"
              unit="U/L"
              refRange="7 – 56 U/L"
              min={5}
              max={600}
              step={0.001}
              median={schema?.medians?.ALT || 38.34}
              value={featureValues.ALT}
              status={getLabStatus('ALT', featureValues.ALT)}
              description="Primary biomarker for hepatocellular inflammation and viral or toxic hepatitis."
              onChange={(val) => handleNumericChange('ALT', val)}
            />

            {/* Bilirubin */}
            <LabInputCard
              label="Total Bilirubin"
              featureKey="Bilirubin"
              unit="mg/dL"
              refRange="0.2 – 1.2 mg/dL"
              min={0.1}
              max={35.0}
              step={0.001}
              median={schema?.medians?.Bilirubin || 1.01}
              value={featureValues.Bilirubin}
              status={getLabStatus('Bilirubin', featureValues.Bilirubin)}
              description="Heme catabolite; critical index of hepatic clearance, cholestasis, and cirrhosis staging."
              onChange={(val) => handleNumericChange('Bilirubin', val)}
            />

            {/* Albumin */}
            <LabInputCard
              label="Serum Albumin"
              featureKey="Albumin"
              unit="g/dL"
              refRange="3.5 – 5.5 g/dL"
              min={1.0}
              max={6.5}
              step={0.001}
              median={schema?.medians?.Albumin || 3.99}
              value={featureValues.Albumin}
              status={getLabStatus('Albumin', featureValues.Albumin)}
              description="Protein synthesized by hepatocytes; sub-3.5 indicates chronic synthetic insufficiency."
              onChange={(val) => handleNumericChange('Albumin', val)}
            />

            {/* Platelets */}
            <LabInputCard
              label="Platelet Count"
              featureKey="Platelets"
              unit="×10⁹/L"
              refRange="150 – 450 ×10⁹/L"
              min={15}
              max={750}
              step={0.001}
              median={schema?.medians?.Platelets || 257.0}
              value={featureValues.Platelets}
              status={getLabStatus('Platelets', featureValues.Platelets)}
              description="Thrombocyte count; thrombocytopenia is a hallmark of splenomegaly and portal hypertension."
              onChange={(val) => handleNumericChange('Platelets', val)}
            />

            {/* Imputation helper tile */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 flex flex-col justify-between text-xs">
              <div>
                <div className="flex items-center gap-1.5 text-cyan-400 font-semibold mb-1">
                  <Database className="h-4 w-4" />
                  <span>Missing-Value Guarantee</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  If an assay is unavailable, clearing the input field will flag the feature for <strong>auto-imputation</strong> with the training split median. The model will run without failing or biasing results.
                </p>
              </div>
              <div className="mt-3 text-[11px] text-slate-500">
                Imputation fitted exclusively on training split (no data leakage).
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Symptoms (Jaundice, Dark Urine, Fatigue, Ascites) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <TestTube2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                2. Clinical Symptoms
                <span className="rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-semibold px-2 py-0.5 border border-amber-500/30">
                  4 Features
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Binary clinical signs and patient-reported symptoms
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SymptomToggleCard
              label="Jaundice"
              featureKey="Sym_Jaundice"
              active={featureValues.Sym_Jaundice === 1}
              onToggle={() => handleToggle('Sym_Jaundice')}
              description="Icterus / yellow discoloration of sclera and skin due to bilirubinemia."
            />

            <SymptomToggleCard
              label="Dark Urine"
              featureKey="Sym_Dark_Urine"
              active={featureValues.Sym_Dark_Urine === 1}
              onToggle={() => handleToggle('Sym_Dark_Urine')}
              description="Conjugated hyperbilirubinuria giving urine a tea-colored appearance."
            />

            <SymptomToggleCard
              label="Chronic Fatigue"
              featureKey="Sym_Fatigue"
              active={featureValues.Sym_Fatigue === 1}
              onToggle={() => handleToggle('Sym_Fatigue')}
              description="Systemic exhaustion commonly presenting in early chronic liver disease."
            />

            <SymptomToggleCard
              label="Ascites"
              featureKey="Sym_Ascites"
              active={featureValues.Sym_Ascites === 1}
              onToggle={() => handleToggle('Sym_Ascites')}
              description="Peritoneal fluid accumulation indicating decompensated cirrhosis or portal hypertension."
              warning={true}
            />
          </div>
        </div>

        {/* Section 3: Comorbidity (Diabetes) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                3. Comorbidity
                <span className="rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-semibold px-2 py-0.5 border border-rose-500/30">
                  1 Feature
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Metabolic conditions interacting with hepatic pathology
              </p>
            </div>
          </div>

          <div className="max-w-md">
            <SymptomToggleCard
              label="Diabetes Mellitus (Type 2)"
              featureKey="Comorb_Diabetes"
              active={featureValues.Comorb_Diabetes === 1}
              onToggle={() => handleToggle('Comorb_Diabetes')}
              description="Major predisposing comorbidity accelerating steatosis, NAFLD/MASH, and fibrogenesis."
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl border border-slate-800 bg-slate-950/80">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Info className="h-4 w-4 text-cyan-400" />
            <span>Ready to evaluate with <strong>10 Boruta Features</strong> &bull; TreeSHAP explanation enabled</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-7 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/25 hover:from-cyan-400 hover:to-indigo-500 transition-all disabled:opacity-50 active:scale-95"
          >
            {submitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Computing Multi-Class Probabilities...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-cyan-200" />
                <span>Run LightGBM Assessment</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

interface LabInputCardProps {
  label: string
  featureKey: string
  unit: string
  refRange: string
  min: number
  max: number
  step?: number | string
  median: number
  value: number | null
  status: { text: string; color: string }
  description: string
  onChange: (val: string) => void
}

function LabInputCard({
  label,
  unit,
  refRange,
  min,
  max,
  step = 0.001,
  median,
  value,
  status,
  description,
  onChange,
}: LabInputCardProps) {
  const [localVal, setLocalVal] = useState<string>(value === null ? '' : String(value))

  useEffect(() => {
    setLocalVal(value === null ? '' : String(value))
  }, [value])

  const handleChange = (newStr: string) => {
    setLocalVal(newStr)
    onChange(newStr)
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-semibold text-white text-xs block">{label}</span>
          <span className="text-[11px] text-slate-400">Ref: {refRange}</span>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${status.color}`}>
          {status.text}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={localVal}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={`Median: ${median}`}
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
        />
        <span className="text-xs font-mono text-slate-400 shrink-0 w-12 text-right">
          {unit}
        </span>
      </div>

      {value === null && (
        <p className="mt-1.5 text-[10px] text-amber-400">
          Field empty: will impute cohort median ({median} {unit})
        </p>
      )}

      <p className="mt-2 text-[11px] text-slate-500 line-clamp-2">
        {description}
      </p>
    </div>
  )
}

interface SymptomToggleCardProps {
  label: string
  featureKey: string
  active: boolean
  onToggle: () => void
  description: string
  warning?: boolean
}

function SymptomToggleCard({
  label,
  active,
  onToggle,
  description,
  warning,
}: SymptomToggleCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-xl border p-4 text-left transition-all flex flex-col justify-between ${
        active
          ? warning
            ? 'border-rose-500/60 bg-rose-950/30 text-white shadow-lg shadow-rose-950/20'
            : 'border-cyan-500/60 bg-cyan-950/30 text-white shadow-lg shadow-cyan-950/20'
          : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="font-semibold text-xs text-white">{label}</span>
          <span
            className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${
              active
                ? warning
                  ? 'bg-rose-500 justify-end'
                  : 'bg-cyan-500 justify-end'
                : 'bg-slate-800 justify-start'
            }`}
          >
            <span className="h-4 w-4 rounded-full bg-white shadow-sm" />
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-snug">{description}</p>
      </div>

      <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
        <span className="text-slate-400">Status:</span>
        <span
          className={`font-bold ${
            active
              ? warning
                ? 'text-rose-400'
                : 'text-cyan-400'
              : 'text-slate-400'
          }`}
        >
          {active ? 'PRESENT (1)' : 'ABSENT (0)'}
        </span>
      </div>
    </button>
  )
}
