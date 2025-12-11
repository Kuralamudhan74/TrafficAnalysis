import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, GeoJSON, Popup } from 'react-leaflet'
import { getRoadsData } from '../../api/mockApi'
import LoadingSpinner from '../../components/LoadingSpinner'
import Card from '../../components/Card'
import Select from '../../components/Select'
import Badge from '../../components/Badge'
import 'leaflet/dist/leaflet.css'

// Fix for default markers in React Leaflet
import L from 'leaflet'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const PublicMap = () => {
  const [region, setRegion] = useState('All')
  const [mode, setMode] = useState('realtime')
  const [roadsData, setRoadsData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRoads()
  }, [region])

  const loadRoads = async () => {
    setLoading(true)
    const data = await getRoadsData(region)
    setRoadsData(data)
    setLoading(false)
  }

  const getCongestionColor = (congestion) => {
    switch (congestion) {
      case 'free':
        return '#22c55e'
      case 'moderate':
        return '#eab308'
      case 'heavy':
        return '#ef4444'
      default:
        return '#6b7280'
    }
  }

  const getCongestionStyle = (feature) => {
    return {
      color: getCongestionColor(feature.properties.congestion),
      weight: 4,
      opacity: 0.8,
    }
  }

  const onEachRoad = (feature, layer) => {
    layer.on({
      click: () => {
        const props = feature.properties
        layer.bindPopup(
          `<div>
            <h3 class="font-semibold">${props.name}</h3>
            <p><strong>Edge ID:</strong> ${props.id}</p>
            <p><strong>Congestion:</strong> ${props.congestion}</p>
            <p><strong>Estimated Delay:</strong> ${props.delay} minutes</p>
            <p><strong>Region:</strong> ${props.region}</p>
          </div>`
        )
      },
    })
  }

  const singaporeCenter = [1.3521, 103.8198]

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Live Congestion Map</h2>
            <p className="text-gray-600">View real-time traffic conditions across Singapore</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              options={[
                { value: 'All', label: 'All Regions' },
                { value: 'North', label: 'North' },
                { value: 'South', label: 'South' },
                { value: 'East', label: 'East' },
                { value: 'West', label: 'West' },
                { value: 'Central', label: 'Central' },
              ]}
              className="w-full sm:w-48"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setMode('realtime')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'realtime'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Real-time
              </button>
              <button
                onClick={() => setMode('forecasted')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'forecasted'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Forecasted
              </button>
            </div>
          </div>
        </div>
      </Card>

      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 z-10 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        )}
        <MapContainer
          center={singaporeCenter}
          zoom={11}
          style={{ height: '600px', width: '100%', borderRadius: '0.5rem' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {roadsData && (
            <GeoJSON
              data={roadsData}
              style={getCongestionStyle}
              onEachFeature={onEachRoad}
            />
          )}
        </MapContainer>
      </div>

      <Card className="bg-gray-50">
        <h3 className="text-lg font-semibold mb-3">Legend</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-1 bg-green-500 rounded"></div>
            <span className="text-sm">Free Flow</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-1 bg-yellow-500 rounded"></div>
            <span className="text-sm">Moderate</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-1 bg-red-500 rounded"></div>
            <span className="text-sm">Heavy</span>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Click on any road segment to view detailed information
        </p>
      </Card>
    </div>
  )
}

export default PublicMap

