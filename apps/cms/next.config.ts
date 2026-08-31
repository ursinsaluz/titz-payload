import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // `/` gehört dem Admin. Das war vorher eine React-Seite in einer
  // `(frontend)`-Route-Gruppe, die nichts anderes tat als `redirect('/admin')` —
  // samt eigenem Root-Layout und 164 Zeilen Template-CSS aus dem Payload-Starter.
  // Als Redirect in der Konfiguration erledigt das die Routing-Schicht, ohne
  // React zu rendern; die Gruppe ist damit weg.
  async redirects() {
    return [{ source: '/', destination: '/admin', permanent: false }]
  },

  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  // Packages with Cloudflare Workers (workerd) specific code
  // Read more: https://opennext.js.org/cloudflare/howtos/workerd
  serverExternalPackages: ['jose', 'pg-cloudflare'],

  // Your Next.js config here
  webpack: (webpackConfig: any) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
