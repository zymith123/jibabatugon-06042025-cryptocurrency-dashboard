import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  modules: ['@nuxt/ui'],
  nitro: {
    experimental: {
      websocket: true
    }
  },
  vite: {
    plugins: [
      tailwindcss()
    ]
  }
})