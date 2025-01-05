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
        source: '/api/subgraph/:path*',
        destination: 'http://35.234.119.105:8000/subgraphs/name/likeaser-testnet/:path*'
      },
      {
        source: '/api/:path*',
        // destination: '/api/proxy',
        destination: 'https://likeaserback.onrender.com/api/:path*'
      },
    ];
  },
};

export default nextConfig;
