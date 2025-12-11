import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default icon issue in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Singapore coordinates
const SINGAPORE_CENTER = [1.3521, 103.8198];
const SINGAPORE_BOUNDS = [
  [1.16, 103.6], // Southwest
  [1.48, 104.0]  // Northeast
];

// Map updater component to refresh GeoJSON data
const MapUpdater = ({ geoJsonData, onFeatureClick }) => {
  const map = useMap();
  
  useEffect(() => {
    if (geoJsonData && geoJsonData.features && geoJsonData.features.length > 0) {
      // Clear existing layers (except tile layer)
      map.eachLayer((layer) => {
        if (layer instanceof L.GeoJSON) {
          map.removeLayer(layer);
        }
      });
      
      // Add new GeoJSON data
      const geoJsonLayer = L.geoJSON(geoJsonData, {
        style: getTrafficStyle,
        onEachFeature: (feature, layer) => {
          // Add tooltip on hover
          const props = feature.properties;
          const popupContent = `
            <div style="font-family: system-ui, -apple-system, sans-serif;">
              <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">
                ${props.road_name || 'Unknown Road'}
              </h4>
              <div style="font-size: 12px; color: #666;">
                <p style="margin: 2px 0;">Speed: ${props.speed.toFixed(1)} km/h</p>
                <p style="margin: 2px 0;">Range: ${props.min_speed}-${props.max_speed} km/h</p>
                <p style="margin: 2px 0;">Congestion: 
                  <span style="
                    padding: 2px 6px; 
                    border-radius: 4px; 
                    font-size: 10px; 
                    font-weight: 600;
                    ${getCongestionBadgeStyle(props.congestion)}
                  ">
                    ${props.congestion.toUpperCase()}
                  </span>
                </p>
              </div>
            </div>
          `;
          
          layer.bindTooltip(popupContent, {
            permanent: false,
            direction: 'top',
            offset: [0, -10],
            className: 'custom-tooltip'
          });
          
          // Add click handler
          layer.on('click', (e) => {
            if (onFeatureClick) {
              onFeatureClick(feature, e);
            }
          });
        }
      });
      
      geoJsonLayer.addTo(map);
    }
  }, [geoJsonData, map, onFeatureClick]);
  
  return null;
};

// Get congestion badge styling
const getCongestionBadgeStyle = (congestion) => {
  switch (congestion) {
    case 'heavy':
      return 'background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;';
    case 'moderate':
      return 'background: #fffbeb; color: #d97706; border: 1px solid #fed7aa;';
    case 'normal':
      return 'background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;';
    default:
      return 'background: #f9fafb; color: #6b7280; border: 1px solid #e5e7eb;';
  }
};

// Style function for traffic segments
const getTrafficStyle = (feature) => {
  const congestion = feature.properties.congestion;
  
  let color;
  switch (congestion) {
    case 'heavy':
      color = '#dc2626'; // Red
      break;
    case 'moderate':
      color = '#d97706'; // Yellow/Orange
      break;
    case 'normal':
      color = '#16a34a'; // Green
      break;
    default:
      color = '#6b7280'; // Gray
  }
  
  return {
    color: color,
    weight: 4,
    opacity: 0.8,
    lineCap: 'round',
    lineJoin: 'round'
  };
};

const TrafficMap = () => {
  const [trafficData, setTrafficData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef(null);
  // Fetch traffic data from API
  const fetchTrafficData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/traffic-map', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.features || !Array.isArray(data.features)) {
        throw new Error('Invalid data format received from API');
      }
      
      setTrafficData(data);
      setLastUpdate(new Date());
      
    } catch (err) {
      console.error('Error fetching traffic data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Setup auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      // Initial fetch
      fetchTrafficData();
      
      // Setup interval for auto-refresh every 60 seconds
      intervalRef.current = setInterval(fetchTrafficData, 60000);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh]);



  // Handle feature click
  const handleFeatureClick = (feature, event) => {
    console.log('Road segment clicked:', feature.properties);
  };

  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    if (!autoRefresh) {
      fetchTrafficData();
    }
  };

  // Get congestion stats
  const getStats = () => {
    if (!trafficData || !trafficData.features) return null;
    
    const stats = { normal: 0, moderate: 0, heavy: 0, total: 0 };
    trafficData.features.forEach(feature => {
      const congestion = feature.properties.congestion;
      stats[congestion] = (stats[congestion] || 0) + 1;
      stats.total++;
    });
    
    return stats;
  };

  const stats = getStats();

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Real-time Traffic Map</h1>
            <p className="text-sm text-gray-600">
              Live traffic congestion data from LTA DataMall API
              {lastUpdate && (
                <span className="ml-2">
                  • Last updated: {lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Auto-refresh toggle */}
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={toggleAutoRefresh}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Auto-refresh (60s)</span>
            </label>
            
            {/* Manual refresh button */}
            <button
              onClick={fetchTrafficData}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>



      {/* Stats Bar */}
      {stats && (
        <div className="bg-white border-b px-6 py-3">
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Normal: {stats.normal}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>Moderate: {stats.moderate}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Heavy: {stats.heavy}</span>
            </div>
            <div className="text-gray-600">
              Total segments: {stats.total}
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3">
          <div className="text-red-800 text-sm">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="flex-1 relative">
        <MapContainer
          center={SINGAPORE_CENTER}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
          maxBounds={SINGAPORE_BOUNDS}
          maxBoundsViscosity={1.0}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {trafficData && (
            <MapUpdater 
              geoJsonData={trafficData} 
              onFeatureClick={handleFeatureClick}
            />
          )}
        </MapContainer>
        
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center z-[1000]">
            <div className="bg-white rounded-lg px-6 py-4 shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                <span className="text-sm font-medium">Loading traffic data...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrafficMap;