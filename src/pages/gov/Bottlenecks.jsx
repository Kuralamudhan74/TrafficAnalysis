import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import Card from '../../components/Card'
import Button from '../../components/Button'
import { toast, ToastContainer } from '../../components/Toast'
import ApiService from '../../api/apiService'
import 'leaflet/dist/leaflet.css'

const Bottlenecks = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // State management
  const [bottlenecks, setBottlenecks] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedBottlenecks, setSelectedBottlenecks] = useState([])
  const [mapCenter, setMapCenter] = useState([1.3521, 103.8198]) // Singapore
  const [mapZoom, setMapZoom] = useState(12)

  // Parameters from URL or defaults
  const sessionId = searchParams.get('sessionId')
  const k = parseInt(searchParams.get('k')) || 10
  const horizon = parseInt(searchParams.get('horizon')) || 30

  // Load bottlenecks on mount or when params change
  useEffect(() => {
    if (sessionId) {
      loadBottlenecks()
    }
  }, [sessionId, k, horizon])

  // Load bottlenecks from API
  const loadBottlenecks = async () => {
    setLoading(true)

    try {
      const response = await ApiService.getTopBottlenecks(k, horizon, 'LIM', false)

      if (!response.success) {
        throw new Error(response.error || 'Failed to load bottlenecks')
      }

      setBottlenecks(response.bottlenecks || [])
      toast.success(`Loaded ${response.bottlenecks?.length || 0} bottlenecks`)

    } catch (error) {
      console.error('Error loading bottlenecks:', error)
      toast.error(error.message || 'Failed to load bottlenecks')
    } finally {
      setLoading(false)
    }
  }

  // Recalculate bottlenecks
  const handleRecalculate = async () => {
    setLoading(true)

    try {
      toast.info('Recalculating bottlenecks...')
      const response = await ApiService.calculateBottlenecks(k, horizon, 'LIM')

      if (!response.success) {
        throw new Error(response.error || 'Calculation failed')
      }

      setBottlenecks(response.bottlenecks || [])
      toast.success('Bottlenecks recalculated successfully')

    } catch (error) {
      console.error('Error recalculating:', error)
      toast.error(error.message || 'Failed to recalculate bottlenecks')
    } finally {
      setLoading(false)
    }
  }

  // Handle what-if analysis
  const handleWhatIfAnalysis = async () => {
    if (selectedBottlenecks.length === 0) {
      toast.warning('Please select at least one bottleneck to analyze')
      return
    }

    setLoading(true)

    try {
      toast.info('Running what-if analysis...')
      const response = await ApiService.whatIfAnalysis(selectedBottlenecks, horizon, 'LIM')

      if (!response.success) {
        throw new Error(response.error || 'Analysis failed')
      }

      // Show results in a toast or modal
      toast.success(
        `Fixing ${selectedBottlenecks.length} bottlenecks reduces jam count from ${response.baseline_jam_count} to ${response.fixed_jam_count}`
      )

    } catch (error) {
      console.error('Error in what-if analysis:', error)
      toast.error(error.message || 'What-if analysis failed')
    } finally {
      setLoading(false)
    }
  }

  // Get color by rank (gradient from red to yellow-green)
  const getColorByRank = (rank, totalCount) => {
    const colors = ['#DC2626', '#EF4444', '#F97316', '#FACC15', '#84CC16']
    const index = Math.floor(((rank - 1) / totalCount) * colors.length)
    return colors[Math.min(index, colors.length - 1)]
  }

  // Get radius by benefit score
  const getRadiusByScore = (score, maxScore) => {
    if (maxScore === 0) return 15
    return 10 + (score / maxScore) * 20 // 10-30 pixel radius
  }

  // Get max benefit score
  const maxBenefitScore = bottlenecks.length > 0
    ? Math.max(...bottlenecks.map(b => b.benefit_score || 0))
    : 1

  // Toggle bottleneck selection
  const toggleBottleneckSelection = (roadNodeId) => {
    setSelectedBottlenecks(prev => {
      if (prev.includes(roadNodeId)) {
        return prev.filter(id => id !== roadNodeId)
      } else {
        return [...prev, roadNodeId]
      }
    })
  }

  // Center map on specific bottleneck
  const centerOnBottleneck = (lat, lon) => {
    setMapCenter([lat, lon])
    setMapZoom(15)
  }

  // Navigate back to upload page
  const goToUpload = () => {
    navigate('/gov/data-upload')
  }

  return (
    <div className="space-y-6">
      <ToastContainer />

      {/* Header */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Bottleneck Finder
            </h2>
            <p className="text-gray-600">
              Top {k} traffic bottlenecks with {horizon}-minute time horizon
            </p>
          </div>
          <div className="flex space-x-2">
            {sessionId && (
              <Button variant="secondary" onClick={goToUpload}>
                Back to Upload
              </Button>
            )}
            <Button onClick={handleRecalculate} disabled={loading}>
              Recalculate
            </Button>
          </div>
        </div>
      </Card>

      {/* Map Visualization */}
      <Card>
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900">Map View</h3>

          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading bottlenecks...</span>
            </div>
          ) : bottlenecks.length > 0 ? (
            <div className="relative">
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: '600px', width: '100%', borderRadius: '8px' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                {/* Bottleneck markers */}
                {bottlenecks.map((bottleneck, index) => (
                  <CircleMarker
                    key={bottleneck.road_node_id}
                    center={[bottleneck.coordinates.lat, bottleneck.coordinates.lon]}
                    radius={getRadiusByScore(bottleneck.benefit_score, maxBenefitScore)}
                    pathOptions={{
                      fillColor: getColorByRank(bottleneck.rank, k),
                      fillOpacity: 0.7,
                      color: '#ffffff',
                      weight: 2
                    }}
                  >
                    <Popup>
                      <div className="p-2">
                        <h4 className="font-bold text-gray-900">Rank #{bottleneck.rank}</h4>
                        <p className="text-sm text-gray-700 mt-1">{bottleneck.road_name}</p>
                        <div className="mt-2 text-xs text-gray-600 space-y-1">
                          <div>
                            <span className="font-medium">Benefit Score:</span> {bottleneck.benefit_score.toFixed(2)}
                          </div>
                          <div>
                            <span className="font-medium">Affected Roads:</span> {bottleneck.affected_roads_count}
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>

              {/* Legend */}
              <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-[1000]">
                <h4 className="font-semibold text-gray-900 mb-2 text-sm">Severity Level</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#DC2626' }}></div>
                    <span className="text-xs text-gray-700">Critical Bottleneck</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#F97316' }}></div>
                    <span className="text-xs text-gray-700">Major Bottleneck</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#FACC15' }}></div>
                    <span className="text-xs text-gray-700">Moderate Bottleneck</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#84CC16' }}></div>
                    <span className="text-xs text-gray-700">Minor Bottleneck</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                  Circle size indicates benefit score
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-gray-500">
              <p className="mb-4">No bottlenecks to display</p>
              <Button onClick={goToUpload}>Upload Data</Button>
            </div>
          )}
        </div>
      </Card>

      {/* Bottleneck List */}
      {bottlenecks.length > 0 && (
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Bottleneck Rankings</h3>
              <Button
                onClick={handleWhatIfAnalysis}
                disabled={selectedBottlenecks.length === 0 || loading}
                variant="secondary"
              >
                What-If Analysis ({selectedBottlenecks.length} selected)
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Select
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Road Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Benefit Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Affected Roads
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bottlenecks.map((bottleneck) => (
                    <tr
                      key={bottleneck.road_node_id}
                      style={{
                        backgroundColor: `${getColorByRank(bottleneck.rank, k)}15`
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedBottlenecks.includes(bottleneck.road_node_id)}
                          onChange={() => toggleBottleneckSelection(bottleneck.road_node_id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: getColorByRank(bottleneck.rank, k) }}
                          ></div>
                          <span className="text-sm font-medium text-gray-900">#{bottleneck.rank}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{bottleneck.road_name}</div>
                        <div className="text-xs text-gray-500">{bottleneck.road_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{bottleneck.benefit_score.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{bottleneck.affected_roads_count}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => centerOnBottleneck(
                            bottleneck.coordinates.lat,
                            bottleneck.coordinates.lon
                          )}
                        >
                          Show on Map
                        </Button>
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

export default Bottlenecks
