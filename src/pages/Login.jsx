import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { toast, ToastContainer } from '../components/Toast'
import Input from '../components/Input'
import Button from '../components/Button'
import Card from '../components/Card'

const Login = () => {
  const [role, setRole] = useState('public')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [twoFA, setTwoFA] = useState('')
  const [errors, setErrors] = useState({})
  const { login } = useAuth()
  const navigate = useNavigate()

  const validate = () => {
    const newErrors = {}
    if (!email.trim()) {
      newErrors.email = 'Email is required'
    }
    if (role !== 'public' && !password.trim()) {
      newErrors.password = 'Password is required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleLogin = (e) => {
    e.preventDefault()
    if (!validate()) return

    // Mock login - just save role and email
    login(email || 'guest@example.com', role)
    
    // Redirect based on role
    const routes = {
      public: '/public/dashboard',
      government: '/gov/dashboard',
      developer: '/dev/algorithms',
      analyst: '/analyst/preprocess',
    }
    
    toast.success('Login successful!')
    navigate(routes[role] || '/public/dashboard')
  }

  const handleGuestAccess = () => {
    login('guest@example.com', 'guest')
    toast.success('Continuing as guest')
    navigate('/public/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <ToastContainer />
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600 mb-2">Smart TrafficSense</h1>
          <p className="text-gray-600">Real-time traffic & congestion intelligence</p>
        </div>

        {/* Role Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Role
          </label>
          <div className="grid grid-cols-2 gap-2">
            {['public', 'government', 'developer', 'analyst'].map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  role === r
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            placeholder="Enter your email"
          />

          {role !== 'public' && (
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              placeholder="Enter your password"
            />
          )}

          {role === 'government' && (
            <Input
              label="2FA Token (Optional)"
              type="text"
              value={twoFA}
              onChange={(e) => setTwoFA(e.target.value)}
              placeholder="Enter 2FA token"
            />
          )}

          <div className="space-y-2">
            <Button type="submit" className="w-full">
              Login
            </Button>
            {role === 'public' && (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleGuestAccess}
              >
                Continue as Guest
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  )
}

export default Login

