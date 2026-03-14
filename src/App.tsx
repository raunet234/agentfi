import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Landing from './pages/Landing';
import Register from './pages/Register';
import Auth from './pages/Auth';
import DashboardLayout from './components/DashboardLayout';
import Overview from './pages/Overview';
import Agents from './pages/Agents';
import AgentDetail from './pages/AgentDetail';
import Pools from './pages/Pools';
import Commit from './pages/Commit';
import Rewards from './pages/Rewards';
import Logs from './pages/Logs';
import SettingsPage from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth" element={<Auth />} />

          {/* Dashboard routes */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Overview />} />
            <Route path="agents" element={<Agents />} />
            <Route path="agent/:id" element={<AgentDetail />} />
            <Route path="pools" element={<Pools />} />
            <Route path="commit" element={<Commit />} />
            <Route path="rewards" element={<Rewards />} />
            <Route path="logs" element={<Logs />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
}
