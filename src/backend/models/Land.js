import React, { useState } from "react";

const PropertyForm = () => {
  const [salePrice, setSalePrice] = useState(0);
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState([]);
  const [featureInput, setFeatureInput] = useState("");
  const [amenities, setAmenities] = useState([]);
  const [amenityInput, setAmenityInput] = useState("");
  const [images, setImages] = useState([]);
  const [imageInput, setImageInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("salePrice", salePrice);
    formData.append("description", description);
    formData.append("features", JSON.stringify(features));
    formData.append("amenities", JSON.stringify(amenities));
    formData.append("images", JSON.stringify(images));
    // ...submit form data
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

      {/* Description input */}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Property description"
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

      {/* Images input */}
      <label>Images (IPFS hashes)</label>
      <div>
        <input
          type="text"
          value={imageInput}
          onChange={(e) => setImageInput(e.target.value)}
          placeholder="Add an image IPFS hash"
        />
        <button
          type="button"
          onClick={() => {
            if (imageInput.trim() !== "") {
              setImages([...images, imageInput.trim()]);
              setImageInput("");
            }
          }}
        >
          Add
        </button>
      </div>
      <ul>
        {images.map((img, i) => (
          <li key={i}>
            {img}{" "}
            <button
              type="button"
              onClick={() => setImages(images.filter((_, idx) => idx !== i))}
            >
              ❌
            </button>
          </li>
        ))}
      </ul>

      {/* ...existing form fields... */}
    </form>
  );
};

export default PropertyForm;