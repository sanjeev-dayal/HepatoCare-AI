const API_BASE = '/api'

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

export interface OverviewData {
  raw_shape: [number, number]
  cleaned_shape: [number, number]
  sample: Record<string, unknown>[]
  dtypes: Record<string, string>
  missing_values: Record<string, number>
  target_distribution: Record<string, number>
}

export interface CorrelationData {
  columns: string[]
  matrix: number[][]
}

export interface DistributionData {
  [col: string]: { bins: number[]; counts: number[] }
}

export interface CategoricalData {
  [col: string]: Record<string, number>
}

export interface FeatureRankingData {
  ranking: { Feature: string; Rank: number; Selected: boolean }[]
  selected: string[]
  rejected: string[]
}

export interface FeatureStat {
  feature: string
  count: number
  mean: number
  std: number
  min: number
  '25%': number
  '50%': number
  '75%': number
  max: number
}

export interface PredictFeature {
  name: string
  label: string
  type: 'binary' | 'numeric'
  min: number
  max: number
  default: number
}

export interface PredictSchema {
  features: PredictFeature[]
  labels: Record<string, string>
}

export interface PredictResult {
  prediction: number
  label: string
  features: Record<string, number>
}

export interface ClassReportRow {
  precision: number
  recall: number
  'f1-score': number
  support: number
}

export interface ModelMetrics {
  classification_report: Record<string, ClassReportRow | number>
  confusion_matrix: number[][]
  labels: string[]
}

export const api = {
  overview: () => fetchJson<OverviewData>('/overview'),
  correlation: () => fetchJson<CorrelationData>('/eda/correlation'),
  distributions: () => fetchJson<DistributionData>('/eda/distributions'),
  categorical: () => fetchJson<CategoricalData>('/eda/categorical'),
  featureRanking: () => fetchJson<FeatureRankingData>('/features/ranking'),
  featureStats: () => fetchJson<FeatureStat[]>('/features/stats'),
  predictSchema: () => fetchJson<PredictSchema>('/predict/schema'),
  predict: (features: Record<string, number>) =>
    fetchJson<PredictResult>('/predict', {
      method: 'POST',
      body: JSON.stringify({ features }),
    }),
  modelMetrics: () => fetchJson<ModelMetrics>('/model/metrics'),
}
