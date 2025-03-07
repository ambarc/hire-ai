/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/browser-agent/:path*',
        destination: 'http://localhost:3001/:path*',
      },
      {
        source: '/api/workflow/:path*',
        destination: 'http://localhost:3100/:path*',
      },
      {
        source: '/browser-agent/:path*',
        destination: 'http://localhost:3001/:path*',
      },
    ];
  },
};

module.exports = nextConfig; 