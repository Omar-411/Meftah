/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mock photos are inline data URIs or external URLs; skip the optimizer so the browser loads them directly.
  images: { unoptimized: true },
  // Listing photos are downsized in the browser and sent with the form until the backend offers a file-upload endpoint.
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
};

export default nextConfig;
