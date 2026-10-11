import { useEffect, useState } from 'react'
import {
  Brain,
  Check,
  Clock,
  Copy,
  Download,
  FileCheck2,
  FileText,
  Lock,
  Printer,
  RefreshCw,
  Search,
  Stethoscope,
  X,
} from 'lucide-react'
import {
  api,
  type AssessmentReportResponse,
  type StoredAssessment,
} from '../api/client'

interface AssessmentHistoryProps {
  onSelectAssessment: (assessment: StoredAssessment) => void
  onNavigateToXai: (assessment: StoredAssessment) => void
  onNavigate: (tabId: 'assessment') => void
  initialSelectedId?: string
}

const CLASS_COLORS: Record<string, string> = {
  Normal: '#10b981',
  'Fatty Liver': '#f59e0b',
  'Alcoholic Liver Disease': '#f97316',
  Cirrhosis: '#ef4444',
  'Hepatitis B': '#3b82f6',
  'Hepatitis C': '#8b5cf6',
}

export function AssessmentHistoryPage({
  onSelectAssessment,
  onNavigateToXai,
  onNavigate,
  initialSelectedId,
}: AssessmentHistoryProps) {
  const [assessments, setAssessments] = useState<StoredAssessment[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClassFilter, setSelectedClassFilter] = useState('All')

  // Modals
  const [detailModalItem, setDetailModalItem] = useState<StoredAssessment | null>(null)
  const [reportModalData, setReportModalData] = useState<AssessmentReportResponse | null>(null)
  const [copiedReport, setCopiedReport] = useState(false)

  const loadAssessments = async () => {
    try {
      setLoading(true)
      const res = await api.assessments()
      setAssessments(res.assessments)

      if (initialSelectedId) {
        const found = res.assessments.find((a) => a.id.toLowerCase() === initialSelectedId.toLowerCase())
        if (found) setDetailModalItem(found)
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAssessments()
  }, [initialSelectedId])

  const handleOpenReport = async (id: string) => {
    try {
      const rep = await api.assessmentReport(id)
      setReportModalData(rep)
    } catch (err: any) {
      console.error(err)
    }
  }

  const handleCopyReport = () => {
    if (!reportModalData) return
    navigator.clipboard.writeText(reportModalData.markdown)
    setCopiedReport(true)
    setTimeout(() => setCopiedReport(false), 2000)
  }

  const handleDownloadReport = () => {
    if (!reportModalData) return
    const blob = new Blob([reportModalData.markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `HepatoCare-Report-${reportModalData.assessment_id}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handlePrintReport = () => {
    window.print()
  }

  // Filtered list
  const filteredList = assessments.filter((item) => {
    const matchesSearch =
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.patient_alias.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.predicted_class_name.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesClass =
      selectedClassFilter === 'All' || item.predicted_class_name === selectedClassFilter

    return matchesSearch && matchesClass
  })

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 text-xs font-medium text-cyan-300 mb-3">
              <Clock className="h-3.5 w-3.5" />
              <span>Page 06 &bull; Patient Registry &amp; Assessment History</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Assessment History &amp; Report Center
            </h1>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              Browse previous model evaluations, review multi-class probability spreads, inspect individual SHAP attributions, or export comprehensive clinical assessment reports.
            </p>
          </div>

          <button
            onClick={() => onNavigate('assessment')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 shrink-0"
          >
            <Stethoscope className="h-4 w-4" />
            <span>New Patient Assessment</span>
          </button>
        </div>
      </div>

      {/* Access Control & Synthetic Data Protection Banner */}
      <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-5 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
              <span>Synthetic Cohort Demonstration &bull; Clinical Privacy Safeguards</span>
              <span className="rounded bg-cyan-500/20 text-cyan-200 text-[10px] px-2 py-0.2">
                HIPAA / GDPR Ready
              </span>
            </h3>
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">
              All records displayed here utilize synthetic, de-identified patient data for demonstration purposes. In a clinical production environment, <strong>Role-Based Access Control (RBAC)</strong>, <strong>AES-256 rest encryption</strong>, TLS 1.3 transit security, and immutable audit logging must be enforced prior to storing Protected Health Information (PHI).
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 backdrop-blur-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, alias or diagnosis..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {/* Disease Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {['All', 'Normal', 'Fatty Liver', 'Alcoholic Liver Disease', 'Cirrhosis', 'Hepatitis B', 'Hepatitis C'].map(
            (cls) => (
              <button
                key={cls}
                onClick={() => setSelectedClassFilter(cls)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  selectedClassFilter === cls
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {cls.replace('Alcoholic Liver Disease', 'ALD').replace('Hepatitis ', 'Hep ')}
              </button>
            )
          )}
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
          <RefreshCw className="h-7 w-7 animate-spin text-cyan-400" />
          <p className="text-xs text-slate-400">Loading patient assessment history...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center text-xs text-slate-400">
          No assessment records match your filter criteria.
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3 px-4">Assessment ID</th>
                  <th className="py-3 px-4">Subject Alias</th>
                  <th className="py-3 px-4">Predicted Diagnosis</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredList.map((item) => {
                  const color = CLASS_COLORS[item.predicted_class_name] || '#06b6d4'
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-cyan-400">{item.id}</td>
                      <td className="py-3 px-4 font-medium text-white">{item.patient_alias}</td>
                      <td className="py-3 px-4">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border"
                          style={{
                            backgroundColor: `${color}15`,
                            color: color,
                            borderColor: `${color}30`,
                          }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                          {item.predicted_class_name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${item.confidence * 100}%`,
                                backgroundColor: color,
                              }}
                            />
                          </div>
                          <span className="font-semibold text-slate-200">
                            {(item.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(item.timestamp).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => setDetailModalItem(item)}
                          className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition-colors"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => onSelectAssessment(item)}
                          className="rounded-lg bg-cyan-950 border border-cyan-800 hover:bg-cyan-900 px-2.5 py-1 text-[11px] font-medium text-cyan-300 transition-colors"
                        >
                          Results
                        </button>
                        <button
                          onClick={() => handleOpenReport(item.id)}
                          className="rounded-lg bg-indigo-950 border border-indigo-800 hover:bg-indigo-900 px-2.5 py-1 text-[11px] font-medium text-indigo-300 transition-colors"
                        >
                          Report
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Inspection Modal */}
      {detailModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
          onClick={() => setDetailModalItem(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase font-mono font-bold">
                  {detailModalItem.id}
                </span>
                <h3 className="font-display text-lg font-bold text-white">
                  Assessment Detail &bull; {detailModalItem.patient_alias}
                </h3>
              </div>
              <button
                onClick={() => setDetailModalItem(null)}
                className="rounded-lg bg-slate-800 hover:bg-slate-700 p-1.5 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Prediction Summary */}
              <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-[11px] block">Predicted Condition</span>
                  <span className="font-display text-xl font-bold text-white">
                    {detailModalItem.predicted_class_name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[11px] block">Model Confidence</span>
                  <span className="font-display text-xl font-bold text-cyan-400 font-mono">
                    {(detailModalItem.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* 6-Class Probabilities Spread */}
              <div>
                <h4 className="font-semibold text-white mb-2">Class Probability Distribution</h4>
                <div className="space-y-1.5">
                  {Object.entries(detailModalItem.probabilities).map(([name, prob]) => {
                    const color = CLASS_COLORS[name] || '#06b6d4'
                    return (
                      <div key={name} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-slate-300">{name}</span>
                        </div>
                        <span className="font-mono font-bold text-white">{(prob * 100).toFixed(2)}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Input Parameters */}
              <div>
                <h4 className="font-semibold text-white mb-2">Boruta Biomarkers</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(detailModalItem.inputs).map(([k, v]) => (
                    <div key={k} className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block truncate">{k}</span>
                      <span className="font-mono font-bold text-white">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    onNavigateToXai(detailModalItem)
                    setDetailModalItem(null)
                  }}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 font-semibold flex items-center gap-1.5"
                >
                  <Brain className="h-4 w-4" />
                  <span>Inspect in Explainable AI</span>
                </button>
                <button
                  onClick={() => {
                    onSelectAssessment(detailModalItem)
                    setDetailModalItem(null)
                  }}
                  className="rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 font-semibold flex items-center gap-1.5"
                >
                  <FileCheck2 className="h-4 w-4" />
                  <span>Open in Results Page</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clinical Report Export Modal */}
      {reportModalData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in"
          onClick={() => setReportModalData(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-cyan-400" />
                <h3 className="font-display text-base font-bold text-white">
                  Clinical Assessment Report Preview &bull; {reportModalData.assessment_id}
                </h3>
              </div>
              <button
                onClick={() => setReportModalData(null)}
                className="rounded-lg bg-slate-800 hover:bg-slate-700 p-1.5 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Markdown Report Content */}
            <div className="flex-1 overflow-y-auto rounded-2xl bg-slate-900/90 border border-slate-800 p-6 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-text">
              {reportModalData.markdown}
            </div>

            {/* Toolbar Buttons */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-slate-400">
                Format: Markdown / De-identified PHI Safe
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyReport}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors"
                >
                  {copiedReport ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedReport ? 'Copied!' : 'Copy Markdown'}</span>
                </button>
                <button
                  onClick={handleDownloadReport}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-cyan-600/20 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download .md</span>
                </button>
                <button
                  onClick={handlePrintReport}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Report</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
