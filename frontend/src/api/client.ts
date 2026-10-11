const API_BASE = '/api'

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`API error (${res.status}): ${errorText || res.statusText}`)
  }
  return res.json()
}

export interface ModelMetricsSummary {
  model_name: string
  validation_accuracy: number
  validation_macro_f1: number
  validation_balanced_accuracy: number
  validation_weighted_f1: number
  test_accuracy: number
  test_macro_f1: number
  test_balanced_accuracy: number
  baseline_model: string
  baseline_accuracy: number
  baseline_macro_f1: number
  baseline_balanced_accuracy: number
  total_training_samples: number
  total_validation_samples: number
  total_test_samples: number
}

export interface RecentHistoryItem {
  id: string
  timestamp: string
  patient_alias: string
  predicted_class_name: string
  confidence: number
  probabilities: Record<string, number>
}

export interface DashboardData {
  total_assessments: number
  disease_distribution: Record<string, number>
  model_metrics: ModelMetricsSummary
  recent_history: RecentHistoryItem[]
}

export interface FeatureMeta {
  name: string
  label: string
  category: 'laboratory' | 'symptoms' | 'comorbidity'
  unit: string
  ref_range: string
  min: number
  max: number
  default: number
  step?: number
  description: string
}

export interface PresetCase {
  name: string
  badge: string
  color: string
  values: Record<string, number>
}

export interface SchemaResponse {
  features: Record<string, FeatureMeta>
  categories: {
    laboratory: string[]
    symptoms: string[]
    comorbidity: string[]
  }
  medians: Record<string, number>
  boruta_order: string[]
  class_names: string[]
  presets: PresetCase[]
}

export interface AssessmentPayload {
  patient_alias?: string
  age?: number | null
  gender?: string | null
  notes?: string | null
  features: Record<string, number | null>
}

export interface ShapContribution {
  feature: string
  label: string
  value: number
  unit: string
  shap_value: number
  direction: 'positive' | 'negative' | 'neutral'
  abs_importance: number
}

export interface AssessmentResult {
  assessment_id: string
  timestamp: string
  patient_alias: string
  predicted_class_id: number
  predicted_class_name: string
  confidence: number
  probabilities: Record<string, number>
  imputed_features: string[]
  inputs: Record<string, number>
  shap_contributions: ShapContribution[]
  clinical_disclaimer: string
}

export interface GlobalExplanationData {
  feature_importance: Array<{
    feature: string
    label: string
    category: string
    importance: number
  }>
  boruta_ranking: Array<{
    Feature: string
    Rank: number
    Selected: boolean
  }>
  shap_summary_url: string
  shap_bar_url: string
  feature_importance_plot_url: string
  features_count: number
  explanation: string
}

export interface ClassPerformance {
  precision: number
  recall: number
  f1: number
  support: number
}

export interface ModelDetailMetrics {
  name: string
  accuracy: number
  macro_f1: number
  balanced_accuracy: number
  weighted_f1: number
  test_accuracy?: number
  test_macro_f1?: number
  test_balanced_accuracy?: number
  features_used: number
  features_list?: string[]
  epochs_trained?: number
  per_class: Record<string, ClassPerformance>
  confusion_matrix: number[][]
}

export interface ComparisonHighlight {
  metric: string
  lightgbm: string
  ft_transformer: string
  delta: string
  winner: string
}

export interface ModelComparisonData {
  classes: string[]
  lightgbm: ModelDetailMetrics
  ft_transformer: ModelDetailMetrics
  comparison_highlights: ComparisonHighlight[]
  key_takeaway: string
}

export interface StoredAssessment {
  id: string
  timestamp: string
  patient_alias: string
  age?: number
  gender?: string
  notes?: string
  inputs: Record<string, number>
  imputed_features?: string[]
  predicted_class_id: number
  predicted_class_name: string
  confidence: number
  probabilities: Record<string, number>
  shap_contributions?: ShapContribution[]
  top_drivers?: Array<{ feature: string; impact: string; shap: number }>
  clinical_disclaimer?: string
}

export interface AssessmentListResponse {
  count: number
  assessments: StoredAssessment[]
}

export interface AssessmentReportResponse {
  assessment_id: string
  markdown: string
  json: StoredAssessment
}

export const api = {
  health: () => fetchJson<{ status: string }>('/health'),
  dashboardStats: () => fetchJson<DashboardData>('/dashboard/stats'),
  featuresSchema: () => fetchJson<SchemaResponse>('/features/schema'),
  predict: (payload: AssessmentPayload) =>
    fetchJson<AssessmentResult>('/predict', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  globalExplanation: () => fetchJson<GlobalExplanationData>('/explain/global'),
  modelMetrics: () => fetchJson<ModelComparisonData>('/model/metrics'),
  assessments: () => fetchJson<AssessmentListResponse>('/assessments'),
  assessmentById: (id: string) => fetchJson<StoredAssessment>(`/assessments/${id}`),
  assessmentReport: (id: string) => fetchJson<AssessmentReportResponse>(`/assessments/${id}/report`),
}
