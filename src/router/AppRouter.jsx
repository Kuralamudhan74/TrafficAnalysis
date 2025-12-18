 import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Login from '../pages/Login'
import SignupPage from '../pages/SignupPage'
import DashboardLayout from '../layouts/DashboardLayout'

// Public pages
import PublicDashboard from '../pages/publicPages/Dashboard'
import PublicMap from '../pages/publicPages/Map'
import PublicRouteStatus from '../pages/publicPages/RouteStatus'
import PublicHotspots from '../pages/publicPages/Hotspots'
import PublicReportIncident from '../pages/publicPages/ReportIncident'
import PublicFeedback from '../pages/publicPages/Feedback'

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
import DataUpload from '../pages/gov/DataUpload'
import Bottlenecks from '../pages/gov/Bottlenecks'
import JamPrediction from '../pages/gov/JamPrediction'

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
      
      {/* Public routes at root level */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['public', 'guest']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<PublicDashboard />} />
      </Route>
      
      <Route
        path="/map"
        element={
          <ProtectedRoute allowedRoles={['public', 'guest']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<PublicMap />} />
      </Route>
      
      <Route
        path="/route-status"
        element={
          <ProtectedRoute allowedRoles={['public', 'guest']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<PublicRouteStatus />} />
      </Route>
      
      <Route
        path="/hotspots"
        element={
          <ProtectedRoute allowedRoles={['public', 'guest']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<PublicHotspots />} />
      </Route>
      
      <Route
        path="/report-incident"
        element={
          <ProtectedRoute allowedRoles={['public', 'guest']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<PublicReportIncident />} />
      </Route>
      
      <Route
        path="/feedback"
        element={
          <ProtectedRoute allowedRoles={['public', 'guest']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<PublicFeedback />} />
      </Route>

      {/* Legacy public routes - redirect to root level */}
      <Route
        path="/public/*"
        element={
          <ProtectedRoute allowedRoles={['public', 'guest']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="map" element={<Navigate to="/map" replace />} />
        <Route path="route-status" element={<Navigate to="/route-status" replace />} />
        <Route path="hotspots" element={<Navigate to="/hotspots" replace />} />
        <Route path="report-incident" element={<Navigate to="/report-incident" replace />} />
        <Route path="feedback" element={<Navigate to="/feedback" replace />} />
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
        <Route path="data-upload" element={<DataUpload />} />
        <Route path="bottlenecks" element={<Bottlenecks />} />
        <Route path="jam-prediction" element={<JamPrediction />} />
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

