import React from "react";

export default function LandDetailsModal({ land, onClose }) {
  if (!land) return null;
  const mi = land.marketInfo || {};

  // Helper for area display
  const formatArea = (area) => {
    if (typeof area === "object" && area !== null) {
      return `${area.acres || 0} Acres, ${area.guntas || 0} Guntas`;
    }
    return area || "N/A";
  };

  // Helper: parse features/amenities/images safely
  const parseField = (field) => {
    if (!field) return [];
    if (Array.isArray(field)) {
      // Case: ['["a","b"]'] → parse again
      if (
        field.length === 1 &&
        typeof field[0] === "string" &&
        field[0].includes("[")
      ) {
        try {
          return JSON.parse(field[0]);
        } catch {
          return field;
        }
      }
      return field;
    }
    if (typeof field === "string") {
      try {
        return JSON.parse(field);
      } catch {
        return [field];
      }
    }
    return [];
  };

  const features = parseField(mi.features);
  const amenities = parseField(mi.nearbyAmenities);
  const images = parseField(mi.images);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Land Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <p>
          <strong>Survey Number:</strong> {land.surveyNumber}
        </p>
        <p>
          <strong>Village:</strong> {land.village}
        </p>
        <p>
          <strong>District:</strong> {land.district}
        </p>
        <p>
          <strong>Area:</strong> {formatArea(land.area)}
        </p>
        <p>
          <strong>Asset ID:</strong> {land.assetId}
        </p>
        <p>
          <strong>Type:</strong> {land.landType}
        </p>
        <p>
          <strong>Status:</strong> {land.status}
        </p>
        <p>
          <strong>Verification Status:</strong> {land.verificationStatus}
        </p>
        {mi && (
          <div className="mt-3">
            <p>
              <strong>Asking Price:</strong> {mi.askingPrice ?? "N/A"}
            </p>
            <p>
              <strong>Description:</strong> {mi.description ?? "No description"}
            </p>
            <div>
              <strong>Features:</strong>
              {features.length > 0 ? (
                <span className="ml-2">{features.join(", ")}</span>
              ) : (
                <span className="ml-2 text-gray-500">None</span>
              )}
            </div>
            <div>
              <strong>Nearby Amenities:</strong>
              {amenities.length > 0 ? (
                <span className="ml-2">{amenities.join(", ")}</span>
              ) : (
                <span className="ml-2 text-gray-500">None</span>
              )}
            </div>
            <div className="mt-3">
              <strong>Images:</strong>
              {images.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {images.map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt={`Land ${i}`}
                      className="w-full h-32 object-cover rounded-md"
                    />
                  ))}
                </div>
              ) : (
                <span className="ml-2 text-gray-500">None</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}