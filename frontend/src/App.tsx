import { useState } from 'react'
import { Layout, type TabId } from './components/Layout'
import { DashboardPage } from './pages/Dashboard'
import { PatientAssessmentPage } from './pages/PatientAssessment'
import { PredictionResultsPage } from './pages/PredictionResults'
import { ExplainableAIPage } from './pages/ExplainableAI'
import { ModelPerformancePage } from './pages/ModelPerformance'
import { AssessmentHistoryPage } from './pages/AssessmentHistory'
import type { AssessmentResult, StoredAssessment } from './api/client'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const [currentAssessment, setCurrentAssessment] = useState<AssessmentResult | null>(null)
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | undefined>(undefined)

  const handleAssessmentComplete = (result: AssessmentResult) => {
    setCurrentAssessment(result)
    setActiveTab('results')
  }

  const handleSelectFromHistory = (stored: StoredAssessment) => {
    // Map StoredAssessment to AssessmentResult structure
    const mapped: AssessmentResult = {
      assessment_id: stored.id,
      timestamp: stored.timestamp,
      patient_alias: stored.patient_alias,
      predicted_class_id: stored.predicted_class_id,
      predicted_class_name: stored.predicted_class_name,
      confidence: stored.confidence,
      probabilities: stored.probabilities,
      imputed_features: stored.imputed_features || [],
      inputs: stored.inputs,
      shap_contributions: stored.shap_contributions || [],
      clinical_disclaimer:
        stored.clinical_disclaimer ||
        'Model Estimate Notice: AI-generated risk calculation. Physician confirmation required.',
    }
    setCurrentAssessment(mapped)
    setActiveTab('results')
  }

  const handleNavigateToXaiFromHistory = (stored: StoredAssessment) => {
    const mapped: AssessmentResult = {
      assessment_id: stored.id,
      timestamp: stored.timestamp,
      patient_alias: stored.patient_alias,
      predicted_class_id: stored.predicted_class_id,
      predicted_class_name: stored.predicted_class_name,
      confidence: stored.confidence,
      probabilities: stored.probabilities,
      imputed_features: stored.imputed_features || [],
      inputs: stored.inputs,
      shap_contributions: stored.shap_contributions || [],
      clinical_disclaimer:
        stored.clinical_disclaimer ||
        'Model Estimate Notice: AI-generated risk calculation. Physician confirmation required.',
    }
    setCurrentAssessment(mapped)
    setActiveTab('explain')
  }

  const handleDashboardNavigate = (
    tabId: 'assessment' | 'results' | 'explain' | 'performance' | 'history',
    selectedId?: string
  ) => {
    if (selectedId) {
      setSelectedHistoryId(selectedId)
    }
    setActiveTab(tabId)
  }

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      hasActiveResult={currentAssessment !== null}
    >
      {activeTab === 'dashboard' && (
        <DashboardPage onNavigate={handleDashboardNavigate} />
      )}

      {activeTab === 'assessment' && (
        <PatientAssessmentPage onSuccess={handleAssessmentComplete} />
      )}

      {activeTab === 'results' && (
        <PredictionResultsPage
          result={currentAssessment}
          onNavigate={setActiveTab}
          onExportReport={(id) => {
            setSelectedHistoryId(id)
            setActiveTab('history')
          }}
        />
      )}

      {activeTab === 'explain' && (
        <ExplainableAIPage
          currentAssessment={currentAssessment}
          onNavigate={setActiveTab}
        />
      )}

      {activeTab === 'performance' && <ModelPerformancePage />}

      {activeTab === 'history' && (
        <AssessmentHistoryPage
          onSelectAssessment={handleSelectFromHistory}
          onNavigateToXai={handleNavigateToXaiFromHistory}
          onNavigate={setActiveTab}
          initialSelectedId={selectedHistoryId}
        />
      )}
    </Layout>
  )
}
