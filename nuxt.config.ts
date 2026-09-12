import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  // All meaningful data here is client-only (Binance WebSocket prices, the
  // paper trading account in localStorage), so SSR would just hydrate a
  // stale/empty shell on every load - render as a pure SPA instead.
  ssr: false,
  css: ['~/assets/css/main.css'],
  modules: ['@nuxt/ui'],
  app: {
    head: {
      title: 'CryptoPulse — Live Crypto Market Dashboard',
      meta: [
        { name: 'description', content: 'Track live cryptocurrency prices from Binance and simulate a trading portfolio in real time.' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap' }
      ]
    }
  },
  nitro: {
    experimental: {
      websocket: true
    }
  },
  // Inter is loaded via the Google Fonts CDN link above; disable @nuxt/fonts'
  // self-hosting providers so it doesn't try to fetch font metadata itself.
  fonts: {
    providers: {
      google: false,
      googleicons: false,
      bunny: false,
      fontshare: false,
      fontsource: false,
      adobe: false
    }
  },
  vite: {
    plugins: [
      tailwindcss()
    ]
  }
})