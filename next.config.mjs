/** @type {import('next').NextConfig} */

// Libera o host do Supabase Storage para o next/image (fotos de produto).
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined

const nextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: 'https',
            hostname: supabaseHost,
            pathname: '/storage/v1/object/public/**',
          },
        ]
      : [],
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options',  value: 'nosniff' },
        { key: 'X-Frame-Options',         value: 'DENY' },
        { key: 'X-XSS-Protection',        value: '1; mode=block' },
        { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
  ],
}

export default nextConfig
