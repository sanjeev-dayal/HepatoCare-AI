import { useState } from 'react'
import { Layout, type TabId } from './components/Layout'
import { OverviewPage } from './pages/Overview'
import { EDAPage } from './pages/EDA'
import { FeatureSelectionPage } from './pages/FeatureSelection'
import { ModelDemoPage } from './pages/ModelDemo'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'overview' && <OverviewPage />}
      {activeTab === 'eda' && <EDAPage />}
      {activeTab === 'features' && <FeatureSelectionPage />}
      {activeTab === 'predict' && <ModelDemoPage />}
    </Layout>
  )
}
