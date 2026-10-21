/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // ONDC registry fetches the signed request id from the subscriber's domain root.
      {
        source: "/ondc-site-verification.html",
        destination: "/api/ondc/site-verification",
      },
      // ONDC calls the registered callback_url; keep it independent of the /api prefix.
      { source: "/on_subscribe", destination: "/api/ondc/on_subscribe" },
    ];
  },
};

export default nextConfig;
