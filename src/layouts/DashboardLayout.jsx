import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  FiMenu, 
  FiX, 
  FiLogOut, 
  FiMap, 
  FiNavigation, 
  FiAlertCircle,
  FiFileText,
  FiHeart,
  FiSettings,
  FiBarChart2,
  FiCalendar,
  FiTrendingUp,
  FiDatabase,
  FiShield,
  FiUsers,
  FiCloud,
  FiActivity,
  FiLayers,
  FiServer,
  FiCode,
  FiZap
} from 'react-icons/fi'

const DashboardLayout = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getMenuItems = () => {
    if (!user) return []

    switch (user.role) {
      case 'public':
      case 'guest':
        return [
          { path: '/dashboard', label: 'Dashboard', icon: FiBarChart2 },
          { path: '/map', label: 'Live Congestion Map', icon: FiMap },
          { path: '/route-status', label: 'Route Traffic Status', icon: FiNavigation },
          { path: '/hotspots', label: 'Daily Top Hotspots', icon: FiAlertCircle },
          { path: '/report-incident', label: 'Report Road Incident', icon: FiFileText },
          { path: '/feedback', label: 'Feedback', icon: FiHeart },
        ]
      case 'government':
        return [
          { path: '/gov/dashboard', label: 'Dashboard', icon: FiBarChart2 },
          { path: '/gov/heatmap', label: 'Congestion Heatmap', icon: FiMap },
          { path: '/gov/roadwork', label: 'Input Roadwork Event', icon: FiCalendar },
          { path: '/gov/emas', label: 'EMAS Incident Status', icon: FiAlertCircle },
          { path: '/gov/reports', label: 'Time-based Reports', icon: FiFileText },
          { path: '/gov/data-upload', label: 'Upload & Analyze', icon: FiDatabase },
          { path: '/gov/bottlenecks', label: 'Bottleneck Finder', icon: FiAlertCircle },
          { path: '/gov/jam-prediction', label: 'Jam Spread Prediction', icon: FiTrendingUp },
          { path: '/gov/simulation', label: 'Event Simulation', icon: FiZap },
          { path: '/gov/weather', label: 'Weather Overlay', icon: FiCloud },
          { path: '/gov/transport', label: 'Public Transport Overlay', icon: FiNavigation },
          { path: '/gov/alerts', label: 'Critical Alerts', icon: FiAlertCircle },
          { path: '/gov/manage-users', label: 'Manage User Accounts', icon: FiUsers },
        ]
      case 'developer':
        return [
          { path: '/dev/algorithms', label: 'Algorithm Modules', icon: FiCode },
          { path: '/dev/performance', label: 'System Performance', icon: FiActivity },
          { path: '/dev/logs', label: 'Maintenance & Logs', icon: FiFileText },
          { path: '/dev/access-roles', label: 'Access Roles', icon: FiShield },
          { path: '/dev/visualization', label: 'Visualization Modules', icon: FiLayers },
          { path: '/dev/backup', label: 'Backup & Restore', icon: FiDatabase },
          { path: '/dev/feedback', label: 'Feedback Management', icon: FiHeart },
          { path: '/dev/integrations', label: 'API Integrations', icon: FiServer },
          { path: '/dev/deployments', label: 'Deployments', icon: FiCloud },
        ]
      case 'analyst':
        return [
          { path: '/analyst/preprocess', label: 'Data Preprocessing', icon: FiDatabase },
          { path: '/analyst/run-model', label: 'Run Traffic Flow Model', icon: FiTrendingUp },
          { path: '/analyst/trends', label: 'View Historical Trends', icon: FiBarChart2 },
          { path: '/analyst/schedule', label: 'Schedule Automated Runs', icon: FiCalendar },
        ]
      default:
        return []
    }
  }

  const menuItems = getMenuItems()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
              >
                {sidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
              </button>
              <div className="ml-4 lg:ml-0">
                <h1 className="text-xl font-bold text-primary-600">Smart TrafficSense</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-sm text-gray-600">
                <span className="font-medium">{user?.role || 'Guest'}</span>
                {user?.email && <span className="ml-2 text-gray-400">• {user.email}</span>}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiLogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-50
            w-64 bg-white shadow-lg lg:shadow-none
            transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            transition-transform duration-200 ease-in-out
            lg:block
            pt-16 lg:pt-0
          `}
        >
          <nav className="h-full overflow-y-auto py-6">
            <ul className="space-y-1 px-3">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <li key={item.path}>
                    <button
                      onClick={() => {
                        navigate(item.path)
                        setSidebarOpen(false)
                      }}
                      className={`
                        w-full flex items-center space-x-3 px-4 py-3 rounded-lg
                        transition-colors
                        ${isActive
                          ? 'bg-primary-50 text-primary-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                        }
                      `}
                    >
                      <Icon size={20} />
                      <span>{item.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 lg:ml-0">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout

