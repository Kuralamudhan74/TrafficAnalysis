import Card from '../../components/Card'
import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const singaporeCenter = [1.3521, 103.8198]

const GovWeather = () => {
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Weather Overlay</h2>
        <p className="text-gray-600">View weather conditions overlaid on traffic map</p>
      </Card>

      <Card>
        <MapContainer
          center={singaporeCenter}
          zoom={11}
          style={{ height: '600px', width: '100%', borderRadius: '0.5rem' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
        </MapContainer>
        <p className="text-sm text-gray-600 mt-4">
          Weather overlay feature will display weather conditions here.
        </p>
      </Card>
    </div>
  )
}

export default GovWeather

