import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import Card from '../../components/Card'
import Button from '../../components/Button'
import { toast, ToastContainer } from '../../components/Toast'
import ApiService from '../../api/apiService'
import 'leaflet/dist/leaflet.css'

const JamPrediction = () => {
  // State management
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(false)
  const [timeHorizon, setTimeHorizon] = useState(30)
  const [modelType, setModelType] = useState('LIM')
  const [mapCenter, setMapCenter] = useState([1.3521, 103.8198]) // Singapore
  const [mapZoom, setMapZoom] = useState(12)

  // Load predictions on mount
  useEffect(() => {
    // This page will be enhanced with prediction functionality
    // For now, show a placeholder
  }, [])

  // Run prediction
  const handleRunPrediction = async () => {
    setLoading(true)

    try {
      toast.info('Running jam spread prediction...')

      // This will be implemented when prediction API is ready
      // For now, show a placeholder message
      toast.info('Jam spread prediction feature coming soon! This will predict how traffic jams spread over time using the LIM model.')

    } catch (error) {
      console.error('Prediction error:', error)
      toast.error(error.message || 'Failed to run prediction')
    } finally {
      setLoading(false)
    }
  }

  // Get risk level color
  const getRiskColor = (probability) => {
    if (probability >= 0.7) return '#DC2626' // Red - High risk
    if (probability >= 0.3) return '#F97316' // Orange - Medium risk
    return '#84CC16' // Green - Low risk
  }

  // Get risk level label
  const getRiskLevel = (probability) => {
    if (probability >= 0.7) return 'High'
    if (probability >= 0.3) return 'Medium'
    return 'Low'
  }

  return (
    <div className="space-y-6">
      <ToastContainer />

      {/* Header */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Jam Spread Prediction
            </h2>
            <p className="text-gray-600">
              Predict how traffic jams will spread over time using the LIM model
            </p>
          </div>
        </div>
      </Card>

      {/* Controls */}
      <Card>
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900">Prediction Parameters</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Time Horizon */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Horizon
              </label>
              <select
                value={timeHorizon}
                onChange={(e) => setTimeHorizon(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
            </div>

            {/* Model Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model Type
              </label>
              <select
                value={modelType}
                onChange={(e) => setModelType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="LIM">LIM (Linear Independent Cascade)</option>
                <option value="LTM">LTM (Linear Threshold Model)</option>
                <option value="SIR">SIR (Susceptible-Infected-Recovered)</option>
                <option value="SIS">SIS (Susceptible-Infected-Susceptible)</option>
              </select>
            </div>
          </div>

          <Button onClick={handleRunPrediction} disabled={loading} className="w-full">
            {loading ? 'Running Prediction...' : 'Run Prediction'}
          </Button>
        </div>
      </Card>

      {/* Info Card */}
      <Card>
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900">How It Works</h3>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Jam Spread Prediction</h4>
            <p className="text-blue-800 text-sm">
              This feature uses the LIM (Linear Independent Cascade) model to predict how traffic jams
              spread across the road network over time. Think of it like water spilling from one road to another.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-2xl mb-2">🔴</div>
              <h4 className="font-medium text-gray-900 mb-1">High Risk (≥70%)</h4>
              <p className="text-sm text-gray-600">
                Very likely to experience congestion within the time horizon
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-2xl mb-2">🟠</div>
              <h4 className="font-medium text-gray-900 mb-1">Medium Risk (30-70%)</h4>
              <p className="text-sm text-gray-600">
                Moderate chance of congestion spreading to this road
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-2xl mb-2">🟢</div>
              <h4 className="font-medium text-gray-900 mb-1">Low Risk (&lt;30%)</h4>
              <p className="text-sm text-gray-600">
                Unlikely to experience congestion in this time period
              </p>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Usage Instructions</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>First, upload road network and GPS data via "Upload & Analyze"</li>
              <li>Complete the preprocessing step</li>
              <li>Run the bottleneck analysis model</li>
              <li>Then return here to predict jam spread from current bottlenecks</li>
            </ol>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-2">📊 Model Information</h4>
            <div className="space-y-2 text-sm text-yellow-800">
              <p><strong>LIM (Linear Independent Cascade):</strong> Uses Monte Carlo simulations with probabilistic spread. Best for general traffic prediction.</p>
              <p><strong>LTM (Linear Threshold Model):</strong> Threshold-based activation. Good for sudden congestion events.</p>
              <p><strong>SIR Model:</strong> Epidemic model with recovery. Models temporary jams well.</p>
              <p><strong>SIS Model:</strong> Epidemic model without immunity. For recurring congestion patterns.</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Map Placeholder */}
      <Card>
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900">Prediction Map</h3>

          <div className="relative">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '500px', width: '100%', borderRadius: '8px' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />

              {predictions.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center z-[1000] pointer-events-none">
                  <div className="bg-white bg-opacity-90 rounded-lg p-6 shadow-lg text-center max-w-md">
                    <div className="text-4xl mb-3">📍</div>
                    <h4 className="font-semibold text-gray-900 mb-2">No Predictions Yet</h4>
                    <p className="text-sm text-gray-600">
                      Upload data and run the model to see jam spread predictions on this map
                    </p>
                  </div>
                </div>
              )}
            </MapContainer>

            {/* Legend */}
            <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-[1000]">
              <h4 className="font-semibold text-gray-900 mb-2 text-sm">Risk Level</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#DC2626' }}></div>
                  <span className="text-xs text-gray-700">High Risk (≥70%)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#F97316' }}></div>
                  <span className="text-xs text-gray-700">Medium Risk (30-70%)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#84CC16' }}></div>
                  <span className="text-xs text-gray-700">Low Risk (&lt;30%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Predictions Table Placeholder */}
      {predictions.length > 0 && (
        <Card>
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">Prediction Results</h3>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Road Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jam Probability
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time Horizon
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {predictions.map((prediction, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {prediction.road_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(prediction.jam_probability * 100).toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className="px-2 py-1 text-xs font-medium rounded-full"
                          style={{
                            backgroundColor: `${getRiskColor(prediction.jam_probability)}20`,
                            color: getRiskColor(prediction.jam_probability)
                          }}
                        >
                          {getRiskLevel(prediction.jam_probability)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {timeHorizon} minutes
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default JamPrediction
