// IPFS Gateway utilities
export const IPFS_GATEWAYS = [
  {
    name: 'ipfs.io',
    url: 'https://ipfs.io/ipfs/',
    description: 'Official IPFS Gateway'
  },
  {
    name: 'dweb.link',
    url: 'https://dweb.link/ipfs/',
    description: 'Protocol Labs Gateway'
  },
  {
    name: 'pinata.cloud',
    url: 'https://gateway.pinata.cloud/ipfs/',
    description: 'Pinata Gateway'
  },
  {
    name: 'cloudflare',
    url: 'https://cloudflare-ipfs.com/ipfs/',
    description: 'Cloudflare Gateway'
  },
  {
    name: 'fleek.co',
    url: 'https://ipfs.fleek.co/ipfs/',
    description: 'Fleek Gateway'
  }
];

export const getIPFSUrl = (hash: string, gateway: string = 'ipfs.io'): string => {
  const gatewayConfig = IPFS_GATEWAYS.find(g => g.name === gateway);
  if (!gatewayConfig) {
    return `https://ipfs.io/ipfs/${hash}`;
  }
  return `${gatewayConfig.url}${hash}`;
};

export const getAllIPFSUrls = (hash: string) => {
  return IPFS_GATEWAYS.map(gateway => ({
    name: gateway.name,
    url: `${gateway.url}${hash}`,
    description: gateway.description
  }));
};

// Function to check if IPFS content is available
export const checkIPFSAvailability = async (hash: string): Promise<boolean> => {
  try {
    const response = await fetch(`https://ipfs.io/ipfs/${hash}`, {
      method: 'HEAD',
      mode: 'no-cors'
    });
    return true;
  } catch (error) {
    console.warn(`IPFS content ${hash} may not be available:`, error);
    return false;
  }
};
