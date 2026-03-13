import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "./App.css";

const coordinates = {
  "Odegaard Library": [47.6565, -122.3107],
  "Allen Library": [47.6559, -122.3080],
  "HUB": [47.6553, -122.3054]
};

function getPinColor(crowd) {
  if (crowd === "Quiet") return "green";
  if (crowd === "Medium") return "yellow";
  return "red";
}

function makeIcon(color) {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
}

function App() {
  const [spots, setSpots] = useState([]);
  const mapRef = useRef(null);

  const loadSpots = async () => {
    const res = await fetch(
      "https://boxnk8ahob.execute-api.us-east-2.amazonaws.com/default/studySignalAPI"
    );
    const data = await res.json();
    setSpots(data);
  };

  useEffect(() => {
    loadSpots();
  }, []);

  useEffect(() => {
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 100);
  }, []);

  return (
    <div className="app">
      <h1>StudySignal</h1>

      <div className="legend">
        <div className="legend-item">
          <span className="dot green"></span> Quiet
        </div>
        <div className="legend-item">
          <span className="dot yellow"></span> Medium
        </div>
        <div className="legend-item">
          <span className="dot red"></span> Busy
        </div>
      </div>

      <div className="map-wrapper">
        <MapContainer
          center={[47.656, -122.308]}
          zoom={16}
          ref={mapRef}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {spots.map((spot, index) => (
            <Marker
              key={index}
              position={coordinates[spot.name]}
              icon={makeIcon(getPinColor(spot.crowd))}
            >
              <Popup>
                <b>{spot.name}</b>
                <br />
                Crowd Level: {spot.crowd}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

export default App;