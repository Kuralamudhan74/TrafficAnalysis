import { useState, useRef, useEffect } from 'react'
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
  FiBarChart2,
  FiChevronDown
} from 'react-icons/fi'

const MapLayout = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
          { path: '/map', label: 'Live Congestion Map', icon: FiMap },
          { path: '/gov/heatmap', label: 'Congestion Heatmap', icon: FiMap },
          { path: '/gov/roadwork', label: 'Roadwork Event', icon: FiFileText },
          { path: '/gov/emas', label: 'EMAS Incident', icon: FiAlertCircle },
          { path: '/gov/reports', label: 'Reports', icon: FiFileText },
          { path: '/gov/bottlenecks', label: 'Bottleneck Finder', icon: FiAlertCircle },
          { path: '/gov/jam-prediction', label: 'Jam Prediction', icon: FiNavigation },
        ]
      case 'developer':
        return [
          { path: '/dev/algorithms', label: 'Algorithms', icon: FiBarChart2 },
          { path: '/map', label: 'Live Congestion Map', icon: FiMap },
          { path: '/dev/performance', label: 'Performance', icon: FiBarChart2 },
          { path: '/dev/logs', label: 'Logs', icon: FiFileText },
        ]
      case 'analyst':
        return [
          { path: '/analyst/data-upload', label: 'Upload & Analyze', icon: FiBarChart2 },
          { path: '/map', label: 'Live Congestion Map', icon: FiMap },
          { path: '/analyst/bottlenecks', label: 'Bottleneck Finder', icon: FiAlertCircle },
          { path: '/analyst/jam-prediction', label: 'Jam Prediction', icon: FiNavigation },
        ]
      default:
        return []
    }
  }

  const menuItems = getMenuItems()
  const visibleItems = menuItems.slice(0, 4) // Show first 4 items in navbar
  const dropdownItems = menuItems.slice(4) // Rest go in dropdown

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navbar with Menu Items */}
      <nav className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left: Logo + Menu Items */}
            <div className="flex items-center space-x-1">
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
              >
                {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
              </button>

              {/* Logo */}
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-primary-600">Smart TrafficSense</h1>
              </div>

              {/* Desktop Menu Items */}
              <div className="hidden lg:flex items-center ml-8 space-x-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.path
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`
                        flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium
                        transition-colors whitespace-nowrap
                        ${isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-700 hover:bg-gray-100'
                        }
                      `}
                    >
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </button>
                  )
                })}

                {/* More dropdown for additional items */}
                {dropdownItems.length > 0 && (
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <span>More</span>
                      <FiChevronDown size={16} className={`transform transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {dropdownOpen && (
                      <div className="absolute left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                        {dropdownItems.map((item) => {
                          const Icon = item.icon
                          const isActive = location.pathname === item.path
                          return (
                            <button
                              key={item.path}
                              onClick={() => {
                                navigate(item.path)
                                setDropdownOpen(false)
                              }}
                              className={`
                                w-full flex items-center space-x-3 px-4 py-2 text-sm
                                ${isActive
                                  ? 'bg-primary-50 text-primary-700'
                                  : 'text-gray-700 hover:bg-gray-100'
                                }
                              `}
                            >
                              <Icon size={16} />
                              <span>{item.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: User Info + Logout */}
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

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-2 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path)
                      setMobileMenuOpen(false)
                    }}
                    className={`
                      w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm
                      ${isActive
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content - Full width, no sidebar */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  )
}

export default MapLayout
