import React, { useState } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './App.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

function App() {
  const [formData, setFormData] = useState({
    current_location: '',
    pickup_location: '',
    dropoff_location: '',
    current_cycle_used: ''
  });

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/calculate-route/', formData);
      setResults(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to calculate route. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const getMapCenter = () => {
    if (results && results.route && results.route.coordinates) {
      const coords = results.route.coordinates;
      return coords[0];
    }
    return [39.8283, -98.5795]; // Center of USA
  };

  return (
    <div className="App">
      <div className="header">
        <h1>🚚 ELD Trucking Route Planner</h1>
        <p>Plan your route with automatic HOS compliance and rest stops</p>
      </div>

      <div className="container">
        {/* Input Form */}
        <div className="card input-form">
          <h2>Trip Details</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Current Location</label>
              <input
                type="text"
                name="current_location"
                value={formData.current_location}
                onChange={handleChange}
                placeholder="e.g., New York, NY"
                required
              />
            </div>

            <div className="form-group">
              <label>Pickup Location</label>
              <input
                type="text"
                name="pickup_location"
                value={formData.pickup_location}
                onChange={handleChange}
                placeholder="e.g., Chicago, IL"
                required
              />
            </div>

            <div className="form-group">
              <label>Dropoff Location</label>
              <input
                type="text"
                name="dropoff_location"
                value={formData.dropoff_location}
                onChange={handleChange}
                placeholder="e.g., Los Angeles, CA"
                required
              />
            </div>

            <div className="form-group">
              <label>Current Cycle Used (Hours)</label>
              <input
                type="number"
                name="current_cycle_used"
                value={formData.current_cycle_used}
                onChange={handleChange}
                placeholder="e.g., 5.5"
                step="0.5"
                min="0"
                max="70"
                required
              />
            </div>

            <button type="submit" className="calculate-btn" disabled={loading}>
              {loading ? 'Calculating...' : 'Calculate Route'}
            </button>
          </form>
        </div>

        {/* Map */}
        <div className="card">
          <h2>Route Map</h2>
          <div className="map-container">
            <MapContainer
              center={getMapCenter()}
              zoom={5}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              {results && results.route && results.route.coordinates && (
                <>
                  {results.route.coordinates.map((coord, idx) => (
                    <Marker key={idx} position={coord}>
                      <Popup>
                        {idx === 0 ? 'Current Location' : 
                         idx === 1 ? 'Pickup' : 'Dropoff'}
                      </Popup>
                    </Marker>
                  ))}
                  <Polyline
                    positions={results.route.coordinates}
                    color="#667eea"
                    weight={4}
                  />
                </>
              )}
            </MapContainer>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && <div className="error-message">{error}</div>}

      {/* Results Section */}
      {results && (
        <div className="results-section">
          <h2>Trip Results</h2>

          {/* Trip Summary */}
          <div className="trip-summary">
            <div className="summary-item">
              <h3>Total Distance</h3>
              <p>{results.total_distance} mi</p>
            </div>
            <div className="summary-item">
              <h3>Estimated Duration</h3>
              <p>{results.total_duration.toFixed(1)} hrs</p>
            </div>
            <div className="summary-item">
              <h3>Total Stops</h3>
              <p>{results.stops.length}</p>
            </div>
          </div>

          {/* Stops List */}
          <div className="stops-list">
            <h3>Required Stops</h3>
            {results.stops.map((stop, idx) => (
              <div key={idx} className="stop-item">
                <strong>{stop.type}</strong>
                <p>Duration: {stop.duration} hour(s)</p>
                {stop.location && <p>Location: {stop.location}</p>}
                <p>Distance: {stop.distance_from_start.toFixed(1)} miles</p>
              </div>
            ))}
          </div>

          {/* ELD Logs */}
          <div className="eld-logs">
            <h3>Electronic Logging Device (ELD) Logs</h3>
            <table className="log-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Hours</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {results.eld_logs.map((log, idx) => (
                  <tr key={idx}>
                    <td>{log.date}</td>
                    <td>{log.time}</td>
                    <td>
                      <span className={`status-badge status-${log.status}`}>
                        {log.status}
                      </span>
                    </td>
                    <td>{log.location}</td>
                    <td>{log.hours_driven}</td>
                    <td>{log.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;