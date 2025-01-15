/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ipfs-chainsafe.dev',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/subgraph',
        destination: 'http://35.198.140.39:8000/subgraphs/name/likeaser-testnet'
      },
      {
        source: '/api/tokens/:path*',
        // destination: '/api/proxy',
        destination: 'https://likeaserback.onrender.com/api/tokens/:path*'
      },
    ];
  },
};

export default nextConfig;
