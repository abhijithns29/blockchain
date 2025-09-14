import React from 'react';

interface IPFSLinksProps {
  hash: string;
  fileName?: string;
}

const IPFSLinks: React.FC<IPFSLinksProps> = ({ hash, fileName }) => {
  // Get the API base URL and convert it to the uploads URL
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const baseUrl = apiBaseUrl.replace('/api', '');
  const localUrl = `${baseUrl}/uploads/${hash}`;
  
  return (
    <div className="mt-1">
      <a
        href={localUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline hover:text-blue-800"
      >
        {fileName || 'View Document'}
      </a>
      <p className="text-xs text-gray-500 mt-1">
        Document stored locally on server
      </p>
    </div>
  );
};

export default IPFSLinks;
