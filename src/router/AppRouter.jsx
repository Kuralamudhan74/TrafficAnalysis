import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Login from '../pages/Login'
import SignupPage from '../pages/SignupPage'
import DashboardLayout from '../layouts/DashboardLayout'

// Public pages
import PublicDashboard from '../pages/public/Dashboard'
import PublicMap from '../pages/public/Map'
import PublicRouteStatus from '../pages/public/RouteStatus'
import PublicHotspots from '../pages/public/Hotspots'
import PublicReportIncident from '../pages/public/ReportIncident'
import PublicFeedback from '../pages/public/Feedback'

// Government pages
import GovDashboard from '../pages/gov/Dashboard'
import GovRoadwork from '../pages/gov/Roadwork'
import GovEMAS from '../pages/gov/EMAS'
import GovAlerts from '../pages/gov/Alerts'
import GovHeatmap from '../pages/gov/Heatmap'
import GovReports from '../pages/gov/Reports'
import GovSimulation from '../pages/gov/Simulation'
import GovWeather from '../pages/gov/Weather'
import GovTransport from '../pages/gov/Transport'
import GovManageUsers from '../pages/gov/ManageUsers'

// Developer pages
import DevAlgorithms from '../pages/dev/Algorithms'
import DevPerformance from '../pages/dev/Performance'
import DevAccessRoles from '../pages/dev/AccessRoles'
import DevFeedback from '../pages/dev/Feedback'
import DevLogs from '../pages/dev/Logs'
import DevVisualization from '../pages/dev/Visualization'
import DevBackup from '../pages/dev/Backup'
import DevIntegrations from '../pages/dev/Integrations'
import DevDeployments from '../pages/dev/Deployments'

// Analyst pages
import AnalystPreprocess from '../pages/analyst/Preprocess'
import AnalystRunModel from '../pages/analyst/RunModel'
import AnalystTrends from '../pages/analyst/Trends'
import AnalystSchedule from '../pages/analyst/Schedule'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return children
}

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<SignupPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/login" element={<Login />} />
      
      {/* Public routes */}
      <Route
        path="/public/*"
        element={
          <ProtectedRoute allowedRoles={['public', 'guest']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<PublicDashboard />} />
        <Route path="map" element={<PublicMap />} />
        <Route path="route-status" element={<PublicRouteStatus />} />
        <Route path="hotspots" element={<PublicHotspots />} />
        <Route path="report-incident" element={<PublicReportIncident />} />
        <Route path="feedback" element={<PublicFeedback />} />
      </Route>

      {/* Government routes */}
      <Route
        path="/gov/*"
        element={
          <ProtectedRoute allowedRoles={['government']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<GovDashboard />} />
        <Route path="roadwork" element={<GovRoadwork />} />
        <Route path="emas" element={<GovEMAS />} />
        <Route path="alerts" element={<GovAlerts />} />
        <Route path="heatmap" element={<GovHeatmap />} />
        <Route path="reports" element={<GovReports />} />
        <Route path="simulation" element={<GovSimulation />} />
        <Route path="weather" element={<GovWeather />} />
        <Route path="transport" element={<GovTransport />} />
        <Route path="manage-users" element={<GovManageUsers />} />
      </Route>

      {/* Developer routes */}
      <Route
        path="/dev/*"
        element={
          <ProtectedRoute allowedRoles={['developer']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="algorithms" replace />} />
        <Route path="algorithms" element={<DevAlgorithms />} />
        <Route path="performance" element={<DevPerformance />} />
        <Route path="access-roles" element={<DevAccessRoles />} />
        <Route path="feedback" element={<DevFeedback />} />
        <Route path="logs" element={<DevLogs />} />
        <Route path="visualization" element={<DevVisualization />} />
        <Route path="backup" element={<DevBackup />} />
        <Route path="integrations" element={<DevIntegrations />} />
        <Route path="deployments" element={<DevDeployments />} />
      </Route>

      {/* Analyst routes */}
      <Route
        path="/analyst/*"
        element={
          <ProtectedRoute allowedRoles={['analyst']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="preprocess" replace />} />
        <Route path="preprocess" element={<AnalystPreprocess />} />
        <Route path="run-model" element={<AnalystRunModel />} />
        <Route path="trends" element={<AnalystTrends />} />
        <Route path="schedule" element={<AnalystSchedule />} />
      </Route>
    </Routes>
  )
}

export default AppRouter

