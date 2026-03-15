import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "./App.css";

// ── Constants ─────────────────────────────────────────────────────────────────
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// UW center point — used for campus radius check in the suggest form
const UW_CENTER = { lat: 47.6553, lng: -122.3035 };
const MAX_RADIUS_KM = 1.8;

// placeId comes from Google Maps — right-click any location on maps.google.com → "What's here?"
const SPOT_DATA = {
  "Odegaard Library": { coords: [47.6565, -122.3107], placeId: "ChIJ9_-_KfMUkFQRky8vzyJ0_m4" },
  "Allen Library": { coords: [47.6559, -122.3080], placeId: "ChIJVVVVRewUkFQRceNi_l_ha2w" },
  "HUB": { coords: [47.6553, -122.3054], placeId: "ChIJcUxTZI0UkFQRRlIzAv2TF8k" },
  "Suzzallo Library": { coords: [47.6557, -122.3088], placeId: "ChIJVVVVRewUkFQRceNi_l_ha2w" },
  "Mary Gates Hall": { coords: [47.6543, -122.3074], placeId: "ChIJmShcqfIUkFQRnEiR0swlJQs" },
  "Foster Business School": { coords: [47.6549, -122.3046], placeId: "ChIJ2UdWeowUkFQR5QqLcCJGitM" },
  "Life Sciences Building": { coords: [47.6508, -122.3104], placeId: "ChIJXbS7cGMVkFQRFncOEPaH2o8" },
  "Engineering Library": { coords: [47.6532, -122.3082], placeId: "ChIJS1XllpIUkFQRckaoNkf-Yos" },
};

const CROWD_META = {
  Quiet: { color: "#16a34a", dot: "#22c55e", label: "Quiet" },
  Medium: { color: "#d97706", dot: "#f59e0b", label: "Medium" },
  Busy: { color: "#dc2626", dot: "#ef4444", label: "Busy" },
};

const CATEGORIES = ["Library", "Cafe", "Study Lounge", "Other"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(isoString) {
  if (!isoString) return null;
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function makeIcon(crowd) {
  const { color } = CROWD_META[crowd] || CROWD_META["Busy"];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <filter id="s" x="-30%" y="-10%" width="160%" height="150%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.22)"/>
      </filter>
      <path d="M16 2C9.373 2 4 7.373 4 14c0 9.333 12 26 12 26S28 23.333 28 14C28 7.373 22.627 2 16 2z"
            fill="${color}" filter="url(#s)"/>
      <circle cx="16" cy="14" r="5.5" fill="white" opacity="0.9"/>
    </svg>`;
  return new L.DivIcon({
    html: svg,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -46],
    className: "",
  });
}

// ── CrowdBadge ────────────────────────────────────────────────────────────────
function CrowdBadge({ crowd, reportCount }) {
  const meta = CROWD_META[crowd] || CROWD_META["Busy"];
  return (
    <span className="crowd-badge" style={{ "--badge-color": meta.color, "--badge-dot": meta.dot }}>
      <span className="badge-dot" />
      {meta.label}
      {reportCount > 0 && (
        <span className="badge-count">{reportCount} report{reportCount !== 1 ? "s" : ""}</span>
      )}
    </span>
  );
}

// ── Side panel ────────────────────────────────────────────────────────────────
function SidePanel({ spot, selectedCrowd, onCrowdChange, onSubmit, onClose, updating, photoUrl }) {
  const ago = timeAgo(spot.lastUpdated);
  const isUpdating = updating === spot.name;

  return (
    <div className="side-panel">
      <div className="panel-photo-wrap">
        {photoUrl ? (
          <img className="panel-photo" src={photoUrl} alt={spot.name} />
        ) : (
          <div className="panel-photo-placeholder">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
        <button className="panel-close" onClick={onClose} aria-label="Close panel">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        {photoUrl && (
          <p className="photo-attribution">Photo via Google Maps</p>
        )}
      </div>

      <div className="panel-body">
        <div className="panel-header">
          <h2 className="panel-name">{spot.name}</h2>
          <CrowdBadge crowd={spot.crowd} reportCount={spot.reportCount || 0} />
        </div>

        {ago && (
          <p className="panel-timestamp">
            <svg viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Updated {ago}
          </p>
        )}

        <div className="panel-divider" />

        <p className="form-label">Report crowd level</p>
        <div className="crowd-options">
          {Object.entries(CROWD_META).map(([value, meta]) => (
            <button
              key={value}
              className={`crowd-option${selectedCrowd === value ? " selected" : ""}`}
              style={{ "--opt-color": meta.color, "--opt-dot": meta.dot }}
              onClick={() => onCrowdChange(spot.name, value)}
            >
              <span className="opt-dot" />
              {meta.label}
            </button>
          ))}
        </div>

        <button
          className="submit-btn"
          disabled={isUpdating}
          onClick={() => onSubmit(spot.name)}
        >
          {isUpdating ? <><span className="btn-spinner" /> Updating…</> : "Submit Report"}
        </button>
      </div>
    </div>
  );
}

// ── Suggest a spot modal ──────────────────────────────────────────────────────
function SuggestModal({ onClose }) {
  const [form, setForm] = useState({ name: "", address: "", category: "Library", notes: "" });
  const [status, setStatus] = useState("idle"); // idle | loading | success | error | tooFar
  const [coords, setCoords] = useState(null);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  // Geocode the address using Google Geocoding API to get coordinates for radius check
  const geocodeAddress = async (address) => {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === "OK" && data.results[0]) {
      return data.results[0].geometry.location; // { lat, lng }
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.address.trim()) return;
    setStatus("loading");

    try {
      // Geocode to get lat/lng for campus radius check
      const location = await geocodeAddress(form.address);
      if (!location) { setStatus("error"); return; }

      const distKm = haversineKm(UW_CENTER.lat, UW_CENTER.lng, location.lat, location.lng);
      if (distKm > MAX_RADIUS_KM) { setStatus("tooFar"); return; }

      setCoords(location);

      // Submit to your AWS Lambda
      const res = await fetch(
        "https://YOUR_SUBMIT_ENDPOINT.execute-api.us-east-2.amazonaws.com/default/submitStudySpot",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            address: form.address.trim(),
            category: form.category,
            notes: form.notes.trim(),
            lat: location.lat,
            lng: location.lng,
          }),
        }
      );
      if (!res.ok) throw new Error();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Suggest a study spot</h2>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {status === "success" ? (
          <div className="modal-success">
            <div className="success-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1.5" />
                <path d="M8 12l3 3 5-5" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3>Thanks for your suggestion!</h3>
            <p>Your spot has been submitted for review. If approved, it'll appear on the map within 24 hours.</p>
            <button className="submit-btn" onClick={onClose}>Done</button>
          </div>
        ) : (
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Location name *</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Kane Hall Room 110"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Address *</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. 4069 Spokane Ln, Seattle, WA"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <div className="category-options">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    className={`category-btn${form.category === cat ? " selected" : ""}`}
                    onClick={() => set("category", cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes <span className="optional">optional</span></label>
              <textarea
                className="form-input form-textarea"
                placeholder="e.g. Great natural light, quiet after 5pm, outlets at every seat"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
              />
            </div>

            {status === "tooFar" && (
              <p className="form-error">
                That address appears to be outside the UW campus area. Only on-campus or nearby spots are accepted.
              </p>
            )}
            {status === "error" && (
              <p className="form-error">Something went wrong. Please check the address and try again.</p>
            )}

            <button
              className="submit-btn"
              disabled={status === "loading" || !form.name.trim() || !form.address.trim()}
              onClick={handleSubmit}
            >
              {status === "loading" ? <><span className="btn-spinner" /> Submitting…</> : "Submit for Review"}
            </button>

            <p className="modal-note">Submissions are reviewed before appearing on the map.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  const [spots, setSpots] = useState([]);
  const [message, setMessage] = useState(null);
  const [selectedCrowds, setSelectedCrowds] = useState({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [activeSpot, setActiveSpot] = useState(null);
  const [photoUrls, setPhotoUrls] = useState({});
  const [showSuggest, setShowSuggest] = useState(false);
  const mapRef = useRef(null);

  const loadSpots = useCallback(async (silent = false) => {
    try {
      const res = await fetch(
        "https://boxnk8ahob.execute-api.us-east-2.amazonaws.com/default/studySignalAPI"
      );
      const data = await res.json();
      setSpots(data);
      setLastRefresh(new Date());
      if (!silent) {
        const defaults = {};
        data.forEach((s) => { defaults[s.name] = s.crowd; });
        setSelectedCrowds(defaults);
      }
    } catch {
      if (!silent) setMessage({ type: "error", text: "Could not load study spots." });
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Fetch a Google Place photo for a spot by placeId
  const fetchPhoto = useCallback(async (spotName) => {
    if (photoUrls[spotName] !== undefined) return; // already fetched
    const spotMeta = SPOT_DATA[spotName];
    if (!spotMeta?.placeId) return;

    try {
      // Place Details to get photo reference
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${spotMeta.placeId}&fields=photos&key=${API_KEY}`;
      const res = await fetch(detailsUrl);
      const data = await res.json();
      const ref = data.result?.photos?.[0]?.photo_reference;
      if (!ref) { setPhotoUrls((p) => ({ ...p, [spotName]: null })); return; }

      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photo_reference=${ref}&key=${API_KEY}`;
      setPhotoUrls((p) => ({ ...p, [spotName]: photoUrl }));
    } catch {
      setPhotoUrls((p) => ({ ...p, [spotName]: null }));
    }
  }, [photoUrls]);

  const handleMarkerClick = (spot) => {
    setActiveSpot(spot);
    fetchPhoto(spot.name);
    setTimeout(() => { mapRef.current?.invalidateSize(); }, 300);
  };

  const handleClosePanel = () => {
    setActiveSpot(null);
    setTimeout(() => { mapRef.current?.invalidateSize(); }, 300);
  };

  const updateSpot = async (name) => {
    setUpdating(name);
    try {
      const res = await fetch(
        "https://cwgw4qu43m.execute-api.us-east-2.amazonaws.com/default/report",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, crowd: selectedCrowds[name] }),
        }
      );
      if (!res.ok) throw new Error();
      setMessage({ type: "success", text: `${name} updated.` });
      await loadSpots(true);
      // Update the active spot to reflect new crowd
      setActiveSpot((prev) =>
        prev?.name === name ? { ...prev, crowd: selectedCrowds[name] } : prev
      );
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: "error", text: `Could not update ${name}.` });
    } finally {
      setUpdating(null);
    }
  };

  const handleCrowdChange = (name, value) => {
    setSelectedCrowds((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => { loadSpots(); }, [loadSpots]);

  useEffect(() => {
    const interval = setInterval(() => loadSpots(true), 30000);
    return () => clearInterval(interval);
  }, [loadSpots]);

  useEffect(() => {
    setTimeout(() => { mapRef.current?.invalidateSize(); }, 150);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="wordmark">
            <svg className="logo-icon" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="currentColor" />
              <circle cx="12" cy="9" r="2.5" fill="white" />
            </svg>
            <span>StudySignal</span>
          </div>
          <p className="tagline">Live crowd levels · University of Washington</p>
          {lastRefresh && (
            <span className="refresh-indicator">
              <span className="refresh-pulse" />
              Live
            </span>
          )}
          <button className="suggest-btn" onClick={() => setShowSuggest(true)}>
            + Suggest a spot
          </button>
        </div>
      </header>

      <main className="app-body">
        {message && (
          <div className={`toast toast-${message.type}`}>
            {message.type === "success" ? (
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            {message.text}
          </div>
        )}

        <div className="legend-bar">
          {Object.entries(CROWD_META).map(([key, meta]) => (
            <div className="legend-pill" key={key}>
              <span className="legend-dot" style={{ background: meta.dot }} />
              {meta.label}
            </div>
          ))}
          <span className="legend-sep" />
          <span className="legend-count">{loading ? "—" : spots.length} locations</span>
        </div>

        <div className={`map-and-panel${activeSpot ? " panel-open" : ""}`}>
          <div className="map-frame">
            {loading && (
              <div className="map-loading">
                <span className="spinner" />
                Loading spots…
              </div>
            )}
            <MapContainer
              center={[47.6548, -122.308]}
              zoom={15}
              ref={mapRef}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {spots.map((spot, i) => {
                const spotMeta = SPOT_DATA[spot.name];
                if (!spotMeta) return null;
                return (
                  <Marker
                    key={i}
                    position={spotMeta.coords}
                    icon={makeIcon(spot.crowd)}
                    eventHandlers={{ click: () => handleMarkerClick(spot) }}
                  />
                );
              })}
            </MapContainer>
          </div>

          {activeSpot && (
            <SidePanel
              spot={activeSpot}
              selectedCrowd={selectedCrowds[activeSpot.name] || activeSpot.crowd}
              onCrowdChange={handleCrowdChange}
              onSubmit={updateSpot}
              onClose={handleClosePanel}
              updating={updating}
              photoUrl={photoUrls[activeSpot.name]}
            />
          )}
        </div>

        <footer className="app-footer">
          <span>Powered by AWS Lambda · DynamoDB · API Gateway · refreshes every 30s</span>
        </footer>
      </main>

      {showSuggest && <SuggestModal onClose={() => setShowSuggest(false)} />}
    </div>
  );
}

export default App;