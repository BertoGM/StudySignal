import { useState } from "react";
import "./App.css";

function App() {
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState("Odegaard Library");
  const [selectedCrowd, setSelectedCrowd] = useState("Busy");
  const [message, setMessage] = useState("");

  const loadSpots = async () => {
    try {
      setLoading(true);

      const res = await fetch("https://boxnk8ahob.execute-api.us-east-2.amazonaws.com/default/studySignalAPI");
      const data = await res.json();

      const sortedSpots = [...data].sort((a, b) => a.name.localeCompare(b.name));
      setSpots(sortedSpots);
    } catch (err) {
      console.error(err);
      setMessage("Could not load study spots.");
    } finally {
      setLoading(false);
    }
  };

  const submitReport = async () => {
    try {
      const res = await fetch(
        "https://cwgw4qu43m.execute-api.us-east-2.amazonaws.com/default/report",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: selectedSpot,
            crowd: selectedCrowd
          })
        }
      );

      if (!res.ok) {
        throw new Error("Failed to submit report");
      }

      setMessage("Report submitted successfully!");
      loadSpots();

      setTimeout(() => {
        setMessage("");
      }, 2500);
    } catch (err) {
      console.error(err);
      setMessage("Could not submit report.");
    }
  };

  return (
    <div className="app">
      <h1>StudySignal</h1>
      <p>Find a place to study.</p>

      {message && <div className="message">{message}</div>}

      <div className="form-section">
        <h2>Submit Crowd Report</h2>

        <label>Study Spot</label>
        <select value={selectedSpot} onChange={(e) => setSelectedSpot(e.target.value)}>
          <option>Odegaard Library</option>
          <option>Allen Library</option>
          <option>HUB</option>
        </select>

        <label>Crowd Level</label>
        <select value={selectedCrowd} onChange={(e) => setSelectedCrowd(e.target.value)}>
          <option>Quiet</option>
          <option>Medium</option>
          <option>Busy</option>
        </select>

        <button onClick={submitReport}>Submit Report</button>
      </div>

      <div className="list-section">
        <button onClick={loadSpots}>
          {loading ? "Loading..." : "Load Study Spots"}
        </button>

        <ul>
          {spots.map((spot, index) => (
            <li key={index}>
              {spot.name} — {spot.crowd}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;