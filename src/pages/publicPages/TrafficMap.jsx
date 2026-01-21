import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, Marker, Popup } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../components/Toast';
import ApiService from '../../api/apiService';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Singapore region options for filtering
const REGION_OPTIONS = [
  { value: 'All', label: 'All Regions' },
  { value: 'North', label: 'North' },
  { value: 'South', label: 'South' },
  { value: 'East', label: 'East' },
  { value: 'West', label: 'West' },
  { value: 'Central', label: 'Central' }
];

// Map mode options
const MAP_MODES = {
  LIVE: 'live',
  PREDICTION: 'prediction'
};

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

// Map click handler component
const MapClickHandler = ({ onMapClick }) => {
  const map = useMap();

  useEffect(() => {
    map.on('click', onMapClick);
    return () => {
      map.off('click', onMapClick);
    };
  }, [map, onMapClick]);

  return null;
};

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
  const [bookmarks, setBookmarks] = useState([]);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [bookmarkName, setBookmarkName] = useState('');
  const [bookmarkNotes, setBookmarkNotes] = useState('');
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [showSavedRoutes, setShowSavedRoutes] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [mapMode, setMapMode] = useState(MAP_MODES.LIVE);
  const [predictionHorizon, setPredictionHorizon] = useState(30); // minutes
  const intervalRef = useRef(null);
  const { user, token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  // Fetch traffic data from API (Live mode)
  const fetchLiveTrafficData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Use ApiService with region parameter
      const data = await ApiService.getTrafficMap(selectedRegion !== 'All' ? selectedRegion : null);

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

  // Fetch prediction data (Prediction mode)
  const fetchPredictionData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Call jam prediction API
      const response = await ApiService.getJamPrediction(predictionHorizon);

      if (response.success && response.predictions) {
        // Transform predictions to GeoJSON format for map display
        const geoJsonData = transformPredictionsToGeoJSON(response.predictions);
        setTrafficData(geoJsonData);
        setLastUpdate(new Date());
      } else {
        throw new Error('Failed to get prediction data');
      }
    } catch (err) {
      console.error('Error fetching prediction data:', err);
      setError(err.message || 'Failed to load prediction data');
      // Fall back to live data if prediction fails
      toast.warning('Prediction unavailable, showing live data');
      await fetchLiveTrafficData();
    } finally {
      setLoading(false);
    }
  };

  // Transform prediction data to GeoJSON format
  const transformPredictionsToGeoJSON = (predictions) => {
    const features = predictions.map((pred, idx) => {
      // Determine congestion level based on predicted jam probability
      let congestion = 'normal';
      if (pred.jam_probability > 0.7) {
        congestion = 'heavy';
      } else if (pred.jam_probability > 0.4) {
        congestion = 'moderate';
      }

      return {
        type: 'Feature',
        properties: {
          road_name: pred.road_name || `Road ${pred.link_id}`,
          speed: pred.predicted_speed || 40,
          min_speed: pred.predicted_speed ? pred.predicted_speed - 10 : 30,
          max_speed: pred.predicted_speed ? pred.predicted_speed + 10 : 50,
          congestion: congestion,
          jam_probability: pred.jam_probability,
          is_prediction: true
        },
        geometry: pred.geometry || {
          type: 'LineString',
          coordinates: pred.coordinates || [[103.8, 1.35], [103.81, 1.35]]
        }
      };
    });

    return {
      type: 'FeatureCollection',
      features: features
    };
  };

  // Main fetch function that routes to appropriate data source
  const fetchTrafficData = async () => {
    if (mapMode === MAP_MODES.PREDICTION) {
      await fetchPredictionData();
    } else {
      await fetchLiveTrafficData();
    }
  };

  // Fetch user bookmarks
  const fetchBookmarks = async () => {
    if (!isAuthenticated || !token) return;

    try {
      const response = await ApiService.getBookmarks(token);
      setBookmarks(response.bookmarks || []);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    }
  };

  // Setup auto-refresh and react to region/mode changes
  useEffect(() => {
    // Initial fetch
    fetchTrafficData();

    if (autoRefresh && mapMode === MAP_MODES.LIVE) {
      // Setup interval for auto-refresh every 60 seconds (only for live mode)
      intervalRef.current = setInterval(fetchTrafficData, 60000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, selectedRegion, mapMode]);

  // Handle region change
  const handleRegionChange = (e) => {
    setSelectedRegion(e.target.value);
  };

  // Handle map mode toggle
  const handleModeToggle = (mode) => {
    setMapMode(mode);
    if (mode === MAP_MODES.PREDICTION) {
      // Disable auto-refresh in prediction mode
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  };

  // Fetch saved routes
  const fetchSavedRoutes = async () => {
    if (!isAuthenticated || !token) return;

    try {
      const response = await ApiService.getRouteBookmarks(token);
      setSavedRoutes(response.routes || []);
    } catch (error) {
      console.error('Error fetching saved routes:', error);
    }
  };

  // Load bookmarks on mount if authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchBookmarks();
      fetchSavedRoutes();
    }
  }, [isAuthenticated, token]);



  // Handle feature click
  const handleFeatureClick = (feature, event) => {
    console.log('Road segment clicked:', feature.properties);
  };

  // Handle map click to add bookmark
  const handleMapClick = (e) => {
    const { lat, lng } = e.latlng;

    // Check if user is authenticated
    if (!isAuthenticated) {
      toast.error('Please login to bookmark locations');
      setTimeout(() => navigate('/login'), 1500);
      return;
    }

    // Set selected location and show modal
    setSelectedLocation({ lat, lng });
    setBookmarkName('');
    setBookmarkNotes('');
    setShowBookmarkModal(true);
  };

  // Save bookmark
  const handleSaveBookmark = async () => {
    if (!bookmarkName.trim()) {
      toast.error('Please enter a name for the bookmark');
      return;
    }

    try {
      await ApiService.addBookmark(
        {
          name: bookmarkName,
          latitude: selectedLocation.lat,
          longitude: selectedLocation.lng,
          address: '',
          notes: bookmarkNotes
        },
        token
      );

      toast.success('Bookmark added successfully!');
      setShowBookmarkModal(false);
      fetchBookmarks(); // Refresh bookmarks list
    } catch (error) {
      console.error('Error adding bookmark:', error);
      toast.error(error.message || 'Failed to add bookmark');
    }
  };

  // Delete bookmark
  const handleDeleteBookmark = async (bookmarkId) => {
    if (!window.confirm('Are you sure you want to delete this bookmark?')) {
      return;
    }

    try {
      await ApiService.deleteBookmark(bookmarkId, token);
      toast.success('Bookmark deleted successfully!');
      fetchBookmarks(); // Refresh bookmarks list
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      toast.error('Failed to delete bookmark');
    }
  };

  // Handle loading a saved route
  const handleLoadRoute = (route) => {
    setShowSavedRoutes(false);
    toast.success(`Loaded route: ${route.name}`);
    toast.info(`From: ${route.start.name} → To: ${route.end.name}`);
    // Navigate to route-status page with the route loaded
    navigate('/route-status', { state: { savedRoute: route } });
  };

  // Delete saved route
  const handleDeleteRoute = async (routeId) => {
    if (!window.confirm('Are you sure you want to delete this saved route?')) {
      return;
    }

    try {
      await ApiService.deleteRouteBookmark(routeId, token);
      toast.success('Route deleted successfully!');
      fetchSavedRoutes();
    } catch (error) {
      console.error('Error deleting route:', error);
      toast.error('Failed to delete route');
    }
  };

  // Toggle favorite status
  const handleToggleFavorite = async (routeId) => {
    try {
      await ApiService.toggleRouteFavorite(routeId, token);
      fetchSavedRoutes();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite');
    }
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
    <div className="flex-1 flex bg-gray-50 h-[calc(100vh-64px)]">
      {/* Saved Routes Sidebar */}
      {isAuthenticated && showSavedRoutes && (
        <div className="w-80 flex-shrink-0 bg-white border-r overflow-y-auto">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-gray-900">Saved Routes</h3>
              <button
                onClick={() => setShowSavedRoutes(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-600">Click to load route details</p>
          </div>

          <div className="p-4 space-y-3">
            {savedRoutes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">No saved routes yet</p>
                <button
                  onClick={() => navigate('/route-status')}
                  className="mt-3 text-blue-600 hover:text-blue-700 text-sm underline"
                >
                  Go to Route Status to save routes
                </button>
              </div>
            ) : (
              savedRoutes.map((route) => (
                <div
                  key={route.id}
                  className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1" onClick={() => handleLoadRoute(route)}>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm text-gray-900">{route.name}</h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(route.id);
                          }}
                          className="text-yellow-500 hover:text-yellow-600"
                        >
                          {route.is_favorite ? '★' : '☆'}
                        </button>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-600">
                          <span className="text-green-600">●</span> {route.start.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          <span className="text-red-600">●</span> {route.end.name}
                        </p>
                      </div>
                      {route.notes && (
                        <p className="text-xs text-gray-500 mt-2 italic">{route.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRoute(route.id);
                      }}
                      className="text-red-500 hover:text-red-700 ml-2 text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {mapMode === MAP_MODES.LIVE ? 'Real-time Traffic Map' : `${predictionHorizon}-Min Traffic Prediction`}
              </h1>
              <p className="text-sm text-gray-600">
                {mapMode === MAP_MODES.LIVE
                  ? 'Live traffic congestion data from LTA DataMall API'
                  : `Predicted traffic conditions in ${predictionHorizon} minutes`}
                {lastUpdate && (
                  <span className="ml-2">
                    • Last updated: {lastUpdate.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center space-x-4">
              {/* Saved Routes Button */}
              {isAuthenticated && (
                <button
                  onClick={() => setShowSavedRoutes(!showSavedRoutes)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm flex items-center gap-2"
                >
                  <span>📍</span>
                  <span>{showSavedRoutes ? 'Hide' : 'Saved Routes'} ({savedRoutes.length})</span>
                </button>
              )}

              {/* Auto-refresh toggle */}
              {mapMode === MAP_MODES.LIVE && (
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={toggleAutoRefresh}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Auto-refresh (60s)</span>
                </label>
              )}

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

        {/* Region Filter and Map Mode Toggle Bar */}
        <div className="bg-white border-b px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Region Filter */}
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-700">Region:</label>
              <select
                value={selectedRegion}
                onChange={handleRegionChange}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {REGION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {selectedRegion !== 'All' && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  Filtering: {selectedRegion} Singapore
                </span>
              )}
            </div>

            {/* Map Mode Toggle */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700 mr-2">Mode:</span>
              <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1">
                <button
                  onClick={() => handleModeToggle(MAP_MODES.LIVE)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    mapMode === MAP_MODES.LIVE
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Live
                </button>
                <button
                  onClick={() => handleModeToggle(MAP_MODES.PREDICTION)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    mapMode === MAP_MODES.PREDICTION
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  30-Min Prediction
                </button>
              </div>
              {mapMode === MAP_MODES.PREDICTION && (
                <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded ml-2">
                  AI-Powered Forecast
                </span>
              )}
            </div>
          </div>
        </div>



      {/* Stats Bar */}
      {stats && (
        <div className="bg-white border-b px-6 py-3">
          <div className="flex items-center justify-between">
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
            {mapMode === MAP_MODES.PREDICTION && (
              <div className="text-sm text-orange-600 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Showing predicted congestion for {predictionHorizon} minutes ahead
              </div>
            )}
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

          <MapClickHandler onMapClick={handleMapClick} />

          {trafficData && (
            <MapUpdater
              geoJsonData={trafficData}
              onFeatureClick={handleFeatureClick}
            />
          )}

          {/* Render bookmark markers */}
          {bookmarks.map((bookmark) => (
            <Marker
              key={bookmark.id}
              position={[bookmark.latitude, bookmark.longitude]}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold text-sm mb-1">{bookmark.name}</h3>
                  {bookmark.notes && (
                    <p className="text-xs text-gray-600 mb-2">{bookmark.notes}</p>
                  )}
                  <button
                    onClick={() => handleDeleteBookmark(bookmark.id)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
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

        {/* Bookmark hint */}
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg px-4 py-2 z-[1000] text-sm text-gray-700">
          {isAuthenticated ? (
            <span>Click anywhere on the map to bookmark a location</span>
          ) : (
            <span>Login to bookmark locations</span>
          )}
        </div>
      </div>
    </div>

      {/* Bookmark Modal */}
      {showBookmarkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000]">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Bookmark</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bookmarkName}
                  onChange={(e) => setBookmarkName(e.target.value)}
                  placeholder="e.g., Home, Office, Favorite Spot"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={bookmarkNotes}
                  onChange={(e) => setBookmarkNotes(e.target.value)}
                  placeholder="Add any notes about this location"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="text-xs text-gray-500">
                Location: {selectedLocation?.lat.toFixed(6)}, {selectedLocation?.lng.toFixed(6)}
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleSaveBookmark}
                className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
              >
                Save Bookmark
              </button>
              <button
                onClick={() => setShowBookmarkModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrafficMap;