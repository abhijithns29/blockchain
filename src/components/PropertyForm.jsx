import React, { useState } from "react";

const PropertyForm = ({ onViewDetails }) => {
  const [salePrice, setSalePrice] = useState(0);
  const [features, setFeatures] = useState([]);
  const [featureInput, setFeatureInput] = useState("");
  const [amenities, setAmenities] = useState([]);
  const [amenityInput, setAmenityInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("salePrice", salePrice);
    formData.append("features", JSON.stringify(features));
    formData.append("amenities", JSON.stringify(amenities));
    // ...submit form data
  };

  const handleViewDetails = () => {
    console.log("View Details clicked", { salePrice, features, amenities });
    if (onViewDetails) {
      onViewDetails({
        salePrice,
        features,
        amenities,
        // ...add other relevant fields if needed...
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ...existing form fields... */}

      {/* Price input */}
      <input
        type="number"
        min="1"
        step="0.01"
        value={salePrice}
        onChange={(e) => setSalePrice(Number(e.target.value))}
        required
      />

      {/* Features input */}
      <label>Features</label>
      <div>
        <input
          type="text"
          value={featureInput}
          onChange={(e) => setFeatureInput(e.target.value)}
          placeholder="Add a feature"
        />
        <button
          type="button"
          onClick={() => {
            if (featureInput.trim() !== "") {
              setFeatures([...features, featureInput.trim()]);
              setFeatureInput("");
            }
          }}
        >
          Add
        </button>
      </div>
      <ul>
        {features.map((f, i) => (
          <li key={i}>
            {f}{" "}
            <button
              type="button"
              onClick={() =>
                setFeatures(features.filter((_, idx) => idx !== i))
              }
            >
              ❌
            </button>
          </li>
        ))}
      </ul>

      {/* Amenities input */}
      <label>Amenities</label>
      <div>
        <input
          type="text"
          value={amenityInput}
          onChange={(e) => setAmenityInput(e.target.value)}
          placeholder="Add an amenity"
        />
        <button
          type="button"
          onClick={() => {
            if (amenityInput.trim() !== "") {
              setAmenities([...amenities, amenityInput.trim()]);
              setAmenityInput("");
            }
          }}
        >
          Add
        </button>
      </div>
      <ul>
        {amenities.map((a, i) => (
          <li key={i}>
            {a}{" "}
            <button
              type="button"
              onClick={() =>
                setAmenities(amenities.filter((_, idx) => idx !== i))
              }
            >
              ❌
            </button>
          </li>
        ))}
      </ul>

      {/* View Details Button */}
      <button
        type="button"
        onClick={handleViewDetails}
        style={{ marginTop: "1rem" }}
      >
        View Details
      </button>

      {/* ...existing form fields... */}
    </form>
  );
};

export default PropertyForm;