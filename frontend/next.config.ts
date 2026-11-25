import type { NextConfig } from "next"

// Same-origin proxy: the browser only talks to /api, so the backend's session cookie
// is first-party and no CORS setup is needed.
const API_URL = process.env.ORBIT_API_URL ?? "http://localhost:8000"

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/:path*` }]
  },
}

export default nextConfig
