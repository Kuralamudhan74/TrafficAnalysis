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
   * Generic GET request
   */
  static async get(endpoint) {
    return this.makeRequest(endpoint, {
      method: 'GET'
    })
  }

  /**
   * Generic POST request
   */
  static async post(endpoint, data = {}) {
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    })
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

  /**
   * Search for locations in Singapore (for autocomplete)
   */
  static async searchLocations(query) {
    return this.makeRequest(`/traffic/search?query=${encodeURIComponent(query)}`, {
      method: 'GET'
    })
  }

  /**
   * Get route with real-time traffic data
   */
  static async getRouteTraffic(start, end) {
    return this.makeRequest('/traffic/route', {
      method: 'POST',
      body: JSON.stringify({ start, end })
    })
  }

  /**
   * Get current traffic speed bands (for debugging/testing)
   */
  static async getSpeedBands() {
    return this.makeRequest('/traffic/speed-bands', {
      method: 'GET'
    })
  }

  // ========== Upload Session Management ==========

  /**
   * Create a new upload session
   */
  static async createUploadSession() {
    return this.makeRequest('/upload/create-session', {
      method: 'POST'
    })
  }

  /**
   * Upload road network GeoJSON file
   */
  static async uploadRoadNetwork(sessionId, file) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('session_id', sessionId)

    return fetch(`${API_BASE_URL}/upload/road-network`, {
      method: 'POST',
      body: formData
    }).then(response => response.json())
  }

  /**
   * Upload GPS trajectories CSV file
   */
  static async uploadGpsTrajectories(sessionId, file) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('session_id', sessionId)

    return fetch(`${API_BASE_URL}/upload/gps-trajectories`, {
      method: 'POST',
      body: formData
    }).then(response => response.json())
  }

  /**
   * Trigger data preprocessing
   */
  static async preprocessData(sessionId) {
    return this.makeRequest('/upload/preprocess', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId })
    })
  }

  /**
   * Get session status
   */
  static async getSessionStatus(sessionId) {
    return this.makeRequest(`/upload/session-status/${sessionId}`, {
      method: 'GET'
    })
  }

  /**
   * Get upload status (legacy)
   */
  static async getUploadStatus() {
    return this.makeRequest('/upload/status', {
      method: 'GET'
    })
  }

  // ========== Bottleneck Analysis ==========

  /**
   * Run bottleneck analysis model
   */
  static async runBottleneckModel(sessionId, k, timeHorizon) {
    return this.makeRequest('/bottlenecks/run-model', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        k: k,
        time_horizon: timeHorizon,
        model_type: 'LIM'
      })
    })
  }

  /**
   * Get top K bottlenecks (cached or calculate)
   */
  static async getTopBottlenecks(k = 10, timeHorizon = 30, modelType = 'LIM', forceRecalculate = false) {
    return this.makeRequest(
      `/bottlenecks/top-k?k=${k}&time_horizon=${timeHorizon}&model_type=${modelType}&force=${forceRecalculate}`,
      { method: 'GET' }
    )
  }

  /**
   * Calculate bottlenecks
   */
  static async calculateBottlenecks(k = 10, timeHorizon = 30, modelType = 'LIM') {
    return this.makeRequest('/bottlenecks/calculate', {
      method: 'POST',
      body: JSON.stringify({
        k: k,
        time_horizon: timeHorizon,
        model_type: modelType
      })
    })
  }

  /**
   * Perform what-if analysis
   */
  static async whatIfAnalysis(fixedRoads, timeHorizon = 30, modelType = 'LIM') {
    return this.makeRequest('/bottlenecks/what-if', {
      method: 'POST',
      body: JSON.stringify({
        fixed_roads: fixedRoads,
        time_horizon: timeHorizon,
        model_type: modelType
      })
    })
  }

  /**
   * Learn influence probabilities
   */
  static async learnInfluenceProbabilities(timeHorizons = [5, 15, 30], modelType = 'LIM') {
    return this.makeRequest('/bottlenecks/learn-influence', {
      method: 'POST',
      body: JSON.stringify({
        time_horizons: timeHorizons,
        model_type: modelType
      })
    })
  }

  /**
   * Get influence flows for visualization (animated lines showing how congestion spreads)
   */
  static async getInfluenceFlows(timeHorizon = 30, minProbability = 0.3) {
    return this.makeRequest(
      `/bottlenecks/influence-flows?time_horizon=${timeHorizon}&min_probability=${minProbability}`,
      { method: 'GET' }
    )
  }

  /**
   * Get bottleneck impacts (which roads are affected by each bottleneck)
   */
  static async getBottleneckImpacts(timeHorizon = 30, bottleneckId = null) {
    const params = `time_horizon=${timeHorizon}${bottleneckId ? `&bottleneck_id=${bottleneckId}` : ''}`
    return this.makeRequest(
      `/bottlenecks/bottleneck-impacts?${params}`,
      { method: 'GET' }
    )
  }

  // ========== Bookmarks ==========

  /**
   * Get all bookmarks for the authenticated user
   */
  static async getBookmarks(token) {
    return this.authenticatedRequest('/bookmarks', token, {
      method: 'GET'
    })
  }

  /**
   * Add a new bookmark
   */
  static async addBookmark(bookmarkData, token) {
    return this.authenticatedRequest('/bookmarks', token, {
      method: 'POST',
      body: JSON.stringify({
        name: bookmarkData.name,
        latitude: bookmarkData.latitude,
        longitude: bookmarkData.longitude,
        address: bookmarkData.address || '',
        notes: bookmarkData.notes || ''
      })
    })
  }

  /**
   * Delete a bookmark by ID
   */
  static async deleteBookmark(bookmarkId, token) {
    return this.authenticatedRequest(`/bookmarks/${bookmarkId}`, token, {
      method: 'DELETE'
    })
  }

  /**
   * Check if a location is already bookmarked
   */
  static async checkBookmark(latitude, longitude, token) {
    return this.authenticatedRequest('/bookmarks/check', token, {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude })
    })
  }

  // ========== Route Bookmarks ==========

  /**
   * Get all route bookmarks for the authenticated user
   */
  static async getRouteBookmarks(token) {
    return this.authenticatedRequest('/route-bookmarks', token, {
      method: 'GET'
    })
  }

  /**
   * Add a new route bookmark
   */
  static async addRouteBookmark(routeData, token) {
    return this.authenticatedRequest('/route-bookmarks', token, {
      method: 'POST',
      body: JSON.stringify({
        name: routeData.name,
        start: routeData.start,
        end: routeData.end,
        notes: routeData.notes || '',
        is_favorite: routeData.is_favorite || false
      })
    })
  }

  /**
   * Delete a route bookmark by ID
   */
  static async deleteRouteBookmark(routeId, token) {
    return this.authenticatedRequest(`/route-bookmarks/${routeId}`, token, {
      method: 'DELETE'
    })
  }

  /**
   * Toggle favorite status of a route bookmark
   */
  static async toggleRouteFavorite(routeId, token) {
    return this.authenticatedRequest(`/route-bookmarks/${routeId}/favorite`, token, {
      method: 'PATCH'
    })
  }

  // ========== Historical Trends ==========

  /**
   * Get historical traffic trends
   * @param {Object} params - { timescale, date_from, date_to, region, session_id }
   */
  static async getHistoricalTrends(params = {}) {
    const queryParams = new URLSearchParams()
    if (params.timescale) queryParams.append('timescale', params.timescale)
    if (params.date_from) queryParams.append('date_from', params.date_from)
    if (params.date_to) queryParams.append('date_to', params.date_to)
    if (params.region) queryParams.append('region', params.region)
    if (params.session_id) queryParams.append('session_id', params.session_id)

    return this.makeRequest(`/trends/historical?${queryParams.toString()}`, {
      method: 'GET'
    })
  }

  /**
   * Get traffic hotspots
   */
  static async getHotspots(params = {}) {
    const queryParams = new URLSearchParams()
    if (params.date_from) queryParams.append('date_from', params.date_from)
    if (params.date_to) queryParams.append('date_to', params.date_to)
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.region) queryParams.append('region', params.region)

    return this.makeRequest(`/trends/hotspots?${queryParams.toString()}`, {
      method: 'GET'
    })
  }

  /**
   * Get available regions
   */
  static async getRegions() {
    return this.makeRequest('/trends/regions', { method: 'GET' })
  }

  /**
   * Get road details with history
   */
  static async getRoadDetails(roadId, params = {}) {
    const queryParams = new URLSearchParams()
    if (params.date_from) queryParams.append('date_from', params.date_from)
    if (params.date_to) queryParams.append('date_to', params.date_to)
    if (params.timescale) queryParams.append('timescale', params.timescale)

    return this.makeRequest(`/trends/road-details/${roadId}?${queryParams.toString()}`, {
      method: 'GET'
    })
  }

  /**
   * Get traffic summary
   */
  static async getTrafficSummary() {
    return this.makeRequest('/trends/summary', { method: 'GET' })
  }

  // ========== User Management (Admin) ==========

  /**
   * List all users (admin only)
   */
  static async getUsers(token, params = {}) {
    const queryParams = new URLSearchParams()
    if (params.role) queryParams.append('role', params.role)
    if (params.status) queryParams.append('status', params.status)
    if (params.page) queryParams.append('page', params.page)
    if (params.limit) queryParams.append('limit', params.limit)

    return this.authenticatedRequest(`/users/?${queryParams.toString()}`, token, {
      method: 'GET'
    })
  }

  /**
   * Get a specific user
   */
  static async getUser(userId, token) {
    return this.authenticatedRequest(`/users/${userId}`, token, {
      method: 'GET'
    })
  }

  /**
   * Create a new user (admin only)
   */
  static async createUser(userData, token) {
    return this.authenticatedRequest('/users/', token, {
      method: 'POST',
      body: JSON.stringify(userData)
    })
  }

  /**
   * Update a user
   */
  static async updateUser(userId, userData, token) {
    return this.authenticatedRequest(`/users/${userId}`, token, {
      method: 'PUT',
      body: JSON.stringify(userData)
    })
  }

  /**
   * Suspend or unsuspend a user
   */
  static async suspendUser(userId, suspend, reason, token) {
    return this.authenticatedRequest(`/users/${userId}/suspend`, token, {
      method: 'PUT',
      body: JSON.stringify({ suspend, reason })
    })
  }

  /**
   * Delete (deactivate) a user
   */
  static async deleteUser(userId, token) {
    return this.authenticatedRequest(`/users/${userId}`, token, {
      method: 'DELETE'
    })
  }

  /**
   * Get user statistics
   */
  static async getUserStats(token) {
    return this.authenticatedRequest('/users/stats', token, {
      method: 'GET'
    })
  }

  // ========== Algorithm Management ==========

  /**
   * List all algorithms
   */
  static async getAlgorithms() {
    return this.makeRequest('/algorithms/', { method: 'GET' })
  }

  /**
   * Get a specific algorithm
   */
  static async getAlgorithm(algorithmId) {
    return this.makeRequest(`/algorithms/${algorithmId}`, { method: 'GET' })
  }

  /**
   * List only active algorithms
   */
  static async getActiveAlgorithms() {
    return this.makeRequest('/algorithms/active', { method: 'GET' })
  }

  /**
   * Suspend an algorithm (developer only)
   */
  static async suspendAlgorithm(algorithmId, reason, token) {
    return this.authenticatedRequest(`/algorithms/${algorithmId}/suspend`, token, {
      method: 'PUT',
      body: JSON.stringify({ reason })
    })
  }

  /**
   * Activate an algorithm (developer only)
   */
  static async activateAlgorithm(algorithmId, token) {
    return this.authenticatedRequest(`/algorithms/${algorithmId}/activate`, token, {
      method: 'PUT'
    })
  }

  /**
   * Update algorithm parameters (developer only)
   */
  static async updateAlgorithmParameters(algorithmId, parameters, token) {
    return this.authenticatedRequest(`/algorithms/${algorithmId}/parameters`, token, {
      method: 'PUT',
      body: JSON.stringify({ parameters })
    })
  }

  /**
   * Get algorithm statistics
   */
  static async getAlgorithmStats() {
    return this.makeRequest('/algorithms/stats', { method: 'GET' })
  }

  // ========== Traffic Map with Region Filter ==========

  /**
   * Get traffic map data with optional region filter
   */
  static async getTrafficMap(region = null) {
    const params = region ? `?region=${encodeURIComponent(region)}` : ''
    return this.makeRequest(`/lta/traffic-map${params}`, { method: 'GET' })
  }

  // ========== Jam Prediction API ==========

  /**
   * Get jam prediction for all roads
   * @param {number} horizonMinutes - Prediction horizon in minutes (default 30)
   */
  static async getJamPrediction(horizonMinutes = 30) {
    return this.makeRequest(`/jam-prediction/predict?horizon=${horizonMinutes}`, {
      method: 'GET'
    })
  }

  /**
   * Get prediction for specific links
   * @param {Array<string>} linkIds - Array of link IDs to predict
   * @param {number} horizonMinutes - Prediction horizon in minutes
   */
  static async getPredictionForLinks(linkIds, horizonMinutes = 30) {
    return this.makeRequest('/jam-prediction/predict-links', {
      method: 'POST',
      body: JSON.stringify({
        link_ids: linkIds,
        horizon: horizonMinutes
      })
    })
  }
}

export default ApiService