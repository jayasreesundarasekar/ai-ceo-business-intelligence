import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { WorkflowProvider } from './store/WorkflowContext';
import Dashboard from './pages/Dashboard';
import Insights from './pages/Insights';
import Slack from './pages/Slack';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Timeline from './pages/Timeline';
import Evaluation from './pages/Evaluation';
import LiveDemo from './pages/LiveDemo';
import CommandCenter from './pages/CommandCenter';
import Simulator from './pages/Simulator';
import Strategy from './pages/Strategy';
import Debate from './pages/Debate';
import Meeting from './pages/Meeting';
import MemoryGraph from './pages/MemoryGraph';
import DataImport from './pages/DataImport';

// App root — routes managed via react-router v6

export default function App() {
  return (
    <WorkflowProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="command-center" element={<CommandCenter />} />
            <Route path="data-import" element={<DataImport />} />
            <Route path="live-demo" element={<LiveDemo />} />
            <Route path="insights" element={<Insights />} />
            <Route path="slack" element={<Slack />} />
            <Route path="reports" element={<Reports />} />
            <Route path="timeline" element={<Timeline />} />
            <Route path="evaluation" element={<Evaluation />} />
            <Route path="simulator" element={<Simulator />} />
            <Route path="strategy" element={<Strategy />} />
            <Route path="debate" element={<Debate />} />
            <Route path="meeting" element={<Meeting />} />
            <Route path="memory-graph" element={<MemoryGraph />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </WorkflowProvider>
  );
}
