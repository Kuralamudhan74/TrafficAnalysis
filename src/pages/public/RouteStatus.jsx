import { useState } from 'react'
import { MapContainer, TileLayer, Polyline, Popup } from 'react-leaflet'
import { getRouteStatus } from '../../api/mockApi'
import LoadingSpinner from '../../components/LoadingSpinner'
import Card from '../../components/Card'
import Input from '../../components/Input'
import Button from '../../components/Button'
import Badge from '../../components/Badge'
import { toast, ToastContainer } from '../../components/Toast'
import 'leaflet/dist/leaflet.css'

const singaporeCenter = [1.3521, 103.8198]

const PublicRouteStatus = () => {
  const [source, setSource] = useState('')
  const [destination, setDestination] = useState('')
  const [loading, setLoading] = useState(false)
  const [routeData, setRouteData] = useState(null)

  const handleCheckRoute = async (e) => {
    e.preventDefault()
    if (!source.trim() || !destination.trim()) {
      toast.error('Please enter both source and destination')
      return
    }

    setLoading(true)
    try {
      const data = await getRouteStatus(source, destination)
      setRouteData(data)
      toast.success('Route analyzed successfully')
    } catch (error) {
      toast.error('Failed to check route status')
    } finally {
      setLoading(false)
    }
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
        return '#3b82f6'
    }
  }

  return (
    <div className="space-y-4">
      <ToastContainer />
      <Card>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Route Traffic Status</h2>
        <form onSubmit={handleCheckRoute} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Enter source location"
            />
            <Input
              label="Destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Enter destination location"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full md:w-auto">
            {loading ? 'Checking...' : 'Check Route Traffic'}
          </Button>
        </form>
      </Card>

      {loading && (
        <Card>
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        </Card>
      )}

      {routeData && !loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <h3 className="text-lg font-semibold mb-4">Route Summary</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Total Distance</p>
                  <p className="text-2xl font-bold text-gray-900">{routeData.distance} km</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Estimated Travel Time</p>
                  <p className="text-2xl font-bold text-gray-900">{routeData.estimatedTime} min</p>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold mb-4">Route Segments</h3>
              <div className="space-y-2">
                {routeData.segments.map((segment, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{segment.roadName}</p>
                      <p className="text-sm text-gray-600">Delay: {segment.delay} min</p>
                    </div>
                    <Badge
                      variant={
                        segment.congestion === 'free'
                          ? 'success'
                          : segment.congestion === 'moderate'
                          ? 'warning'
                          : 'danger'
                      }
                    >
                      {segment.congestion}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card>
            <h3 className="text-lg font-semibold mb-4">Route Map</h3>
            <MapContainer
              center={singaporeCenter}
              zoom={12}
              style={{ height: '500px', width: '100%', borderRadius: '0.5rem' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <Polyline
                positions={routeData.route}
                color="#3b82f6"
                weight={5}
                opacity={0.8}
              >
                <Popup>
                  <div>
                    <p className="font-semibold">Route from {source} to {destination}</p>
                    <p>Distance: {routeData.distance} km</p>
                    <p>Estimated Time: {routeData.estimatedTime} min</p>
                  </div>
                </Popup>
              </Polyline>
            </MapContainer>
          </Card>
        </>
      )}
    </div>
  )
}

export default PublicRouteStatus

