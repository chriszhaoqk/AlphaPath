import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import LearningPage from '@/pages/Learning';
import JournalPage from '@/pages/Journal';
import Skills from '@/pages/Skills';
import Strategy from '@/pages/Strategy';
import Settings from '@/pages/Settings';
import Schedule from '@/pages/Schedule';
import Tasks from '@/pages/Tasks';
import Dashboard from '@/pages/Dashboard';
import Roadmap from '@/pages/Roadmap';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      setLoading(false);
    };
    init();
  }, [checkAuth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1419] flex items-center justify-center">
        <div className="text-[#D4A853] text-lg">加载中...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/roadmap" element={<Roadmap />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/learning" element={<LearningPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/strategy" element={<Strategy />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
