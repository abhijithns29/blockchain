import React, { useState } from "react";

const Profile = ({ user }) => {
  const [ownedProperties, setOwnedProperties] = useState([]);
  const [showOwned, setShowOwned] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleShowOwned = async () => {
    setLoading(true);
    setShowOwned(true);
    try {
      // Fetch owned properties using user's MongoDB ObjectId
      const res = await fetch(`http://localhost:5000/api/lands/my-lands`, {
        headers: {
          Authorization: `Bearer ${user.token}` // if you use JWT
        }
      });
      const data = await res.json();
      setOwnedProperties(data.lands || []);
    } catch (e) {
      setOwnedProperties([]);
    }
    setLoading(false);
  };

  return (
    <div>
      {/* ...existing code... */}
      <button onClick={handleShowOwned} style={{ margin: "1rem 0" }}>
        Show Owned Property
      </button>
      {showOwned && (
        <div>
          <h3>Owned Properties</h3>
          {loading ? (
            <div>Loading...</div>
          ) : ownedProperties.length === 0 ? (
            <div>No properties found.</div>
          ) : (
            <ul>
              {ownedProperties.map((prop) => (
                <li key={prop._id || prop.id}>
                  {prop.surveyNumber} - {prop.village}, {prop.district} (Asset ID:{" "}
                  {prop.assetId})
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {/* ...existing code... */}
    </div>
  );
};

export default Profile;