/**
 * API service for Traffic Analysis authentication
 * Handles all API calls to the Flask backend
 */

const API_BASE_URL = 'http://localhost:5000/api'

class ApiService {
  /**
   * Make HTTP request to API endpoint
   */
  static async makeRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
    }
    
    const config = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    }
    
    try {
      const response = await fetch(url, config)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }
      
      return data
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }
  
  /**
   * User signup
   */
  static async signup(userData) {
    return this.makeRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        role: userData.role
      })
    })
  }
  
  /**
   * User login
   */
  static async login(credentials) {
    return this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
        role: credentials.role
      })
    })
  }
  
  /**
   * Verify JWT token
   */
  static async verifyToken(token) {
    return this.makeRequest('/auth/verify-token', {
      method: 'POST',
      body: JSON.stringify({ token })
    })
  }
  
  /**
   * Make authenticated request with token
   */
  static async authenticatedRequest(endpoint, token, options = {}) {
    return this.makeRequest(endpoint, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    })
  }

  /**
   * Submit incident report
   */
  static async submitIncident(incidentData, token) {
    return this.authenticatedRequest('/incidents', token, {
      method: 'POST',
      body: JSON.stringify(incidentData)
    })
  }

  /**
   * Get user's incidents
   */
  static async getUserIncidents(token) {
    return this.authenticatedRequest('/incidents', token, {
      method: 'GET'
    })
  }

  /**
   * Get specific incident by ID
   */
  static async getIncident(incidentId, token) {
    return this.authenticatedRequest(`/incidents/${incidentId}`, token, {
      method: 'GET'
    })
  }
}

export default ApiService