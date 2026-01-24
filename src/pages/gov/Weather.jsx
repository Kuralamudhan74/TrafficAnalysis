import { useState, useEffect } from 'react'
import Card from '../../components/Card'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import ApiService from '../../api/apiService'
import LoadingSpinner from '../../components/LoadingSpinner'
import Badge from '../../components/Badge'
import Select from '../../components/Select'

const singaporeCenter = [1.3521, 103.8198]

// Weather icon mapping
const weatherIcons = {
  'sunny': '☀️',
  'clear-night': '🌙',
  'partly-cloudy': '⛅',
  'partly-cloudy-day': '🌤️',
  'partly-cloudy-night': '☁️',
  'cloudy': '☁️',
  'light-rain': '🌦️',
  'rain': '🌧️',
  'heavy-rain': '⛈️',
  'thunderstorm': '⛈️',
  'haze': '🌫️',
  'windy': '💨',
  'unknown': '❓'
}

// Severity color mapping
const severityColors = {
  'low': '#22c55e',      // green
  'medium': '#eab308',   // yellow
  'high': '#ef4444',     // red
  'very_high': '#7c2d12' // dark red
}

function WeatherMarkers({ weatherData }) {
  const map = useMap()

  return (
    <>
      {weatherData.map((item, index) => {
        if (!item.latitude || !item.longitude) return null

        const color = severityColors[item.severity] || '#3b82f6'
        const icon = weatherIcons[item.icon] || '❓'

        return (
          <CircleMarker
            key={index}
            center={[item.latitude, item.longitude]}
            radius={12}
            fillColor={color}
            color={color}
            weight={2}
            opacity={0.8}
            fillOpacity={0.5}
          >
            <Popup>
              <div className="text-center">
                <div className="text-2xl mb-1">{icon}</div>
                <div className="font-bold">{item.area}</div>
                <div className="text-sm text-gray-600">{item.forecast}</div>
                <div className="text-xs mt-1">
                  <Badge variant={item.severity === 'low' ? 'success' : item.severity === 'medium' ? 'warning' : 'danger'}>
                    {item.traffic_impact} traffic impact
                  </Badge>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </>
  )
}

function RainfallMarkers({ rainfallData }) {
  return (
    <>
      {rainfallData.map((item, index) => {
        if (!item.latitude || !item.longitude) return null

        // Color based on rainfall intensity
        let color = '#22c55e' // green (no/low rain)
        if (item.rainfall_mm > 10) color = '#ef4444' // red (heavy)
        else if (item.rainfall_mm > 2) color = '#eab308' // yellow (moderate)
        else if (item.rainfall_mm > 0) color = '#3b82f6' // blue (light)

        return (
          <CircleMarker
            key={`rain-${index}`}
            center={[item.latitude, item.longitude]}
            radius={8}
            fillColor={color}
            color={color}
            weight={2}
            opacity={0.8}
            fillOpacity={0.6}
          >
            <Popup>
              <div className="text-center">
                <div className="text-2xl mb-1">🌧️</div>
                <div className="font-bold">{item.station_name}</div>
                <div className="text-lg">{item.rainfall_mm} mm</div>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </>
  )
}

const GovWeather = () => {
  const [weatherData, setWeatherData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [viewMode, setViewMode] = useState('forecast') // forecast, rainfall, combined
  const [forecast24h, setForecast24h] = useState(null)

  useEffect(() => {
    loadWeatherData()
    // Refresh every 5 minutes
    const interval = setInterval(loadWeatherData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const loadWeatherData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [currentRes, forecastRes] = await Promise.all([
        ApiService.getCombinedWeather(),
        ApiService.get24HourForecast()
      ])

      if (currentRes.success) {
        setWeatherData(currentRes.data)
      } else {
        setError('Failed to load weather data')
      }

      if (forecastRes.success) {
        setForecast24h(forecastRes.data)
      }
    } catch (err) {
      setError(err.message || 'Failed to load weather data')
    } finally {
      setLoading(false)
    }
  }

  const getOverallCondition = () => {
    if (!forecast24h?.general) return null
    const general = forecast24h.general
    return {
      forecast: general.forecast,
      temperature: `${general.temperature?.low || '-'}°C - ${general.temperature?.high || '-'}°C`,
      humidity: `${general.relative_humidity?.low || '-'}% - ${general.relative_humidity?.high || '-'}%`
    }
  }

  const overall = getOverallCondition()

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Weather Overlay</h2>
            <p className="text-gray-600">Real-time weather conditions from data.gov.sg</p>
          </div>
          <div className="flex items-center space-x-4">
            <Select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              options={[
                { value: 'forecast', label: '2-Hour Forecast' },
                { value: 'rainfall', label: 'Rainfall' },
                { value: 'combined', label: 'Combined View' }
              ]}
            />
            <button
              onClick={loadWeatherData}
              className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={loading}
            >
              Refresh
            </button>
          </div>
        </div>
      </Card>

      {error && (
        <Card className="bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      {overall && (
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-gray-500">Today's Forecast</div>
              <div className="text-lg font-semibold">{overall.forecast}</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-sm text-gray-500">Temperature</div>
              <div className="text-lg font-semibold">{overall.temperature}</div>
            </div>
            <div className="text-center p-4 bg-cyan-50 rounded-lg">
              <div className="text-sm text-gray-500">Humidity</div>
              <div className="text-lg font-semibold">{overall.humidity}</div>
            </div>
          </div>
        </Card>
      )}

      <Card>
        {loading && !weatherData ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            <MapContainer
              center={singaporeCenter}
              zoom={11}
              style={{ height: '500px', width: '100%', borderRadius: '0.5rem' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {weatherData && (viewMode === 'forecast' || viewMode === 'combined') && (
                <WeatherMarkers weatherData={weatherData.forecasts || []} />
              )}
              {weatherData && (viewMode === 'rainfall' || viewMode === 'combined') && (
                <RainfallMarkers rainfallData={weatherData.rainfall || []} />
              )}
            </MapContainer>

            <div className="mt-4 flex flex-wrap gap-4">
              <div className="text-sm">
                <span className="font-semibold">Legend: </span>
                <span className="inline-flex items-center">
                  <span className="w-3 h-3 rounded-full bg-green-500 mr-1"></span> Low Impact
                </span>
                <span className="inline-flex items-center ml-3">
                  <span className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></span> Moderate
                </span>
                <span className="inline-flex items-center ml-3">
                  <span className="w-3 h-3 rounded-full bg-red-500 mr-1"></span> High Impact
                </span>
              </div>
            </div>
          </>
        )}
      </Card>

      {weatherData?.forecasts && (
        <Card>
          <h3 className="text-lg font-semibold mb-4">Area Forecasts</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {weatherData.forecasts.slice(0, 12).map((item, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg text-center">
                <div className="text-xl">{weatherIcons[item.icon] || '❓'}</div>
                <div className="font-medium text-sm truncate">{item.area}</div>
                <div className="text-xs text-gray-500">{item.forecast}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export default GovWeather
