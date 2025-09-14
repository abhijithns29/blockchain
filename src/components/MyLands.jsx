import React, { useEffect, useState } from "react";
import LandDetailsModal from "./LandDetailsModal";

const MyLands = () => {
  const [lands, setLands] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch("/api/lands/my-lands")
      .then((r) => r.json())
      .then(setLands)
      .catch((e) => console.error("my-lands fetch error", e));
  }, []);

  return (
    <div>
      <h1>My Lands</h1>
      <div className="grid">
        {lands.map((land) => (
          <div key={land._id} className="card">
            <h3>{land.surveyNumber || land._id}</h3>
            <p>Price: {land.marketInfo?.askingPrice || "—"}</p>
            <button onClick={() => setSelected(land)}>View</button>
          </div>
        ))}
      </div>
      {selected && (
        <LandDetailsModal land={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
};

export default MyLands;