<script setup lang="ts">
const { connected } = useCryptoSocket()
</script>

<template>
  <nav class="sticky top-0 z-40 bg-gray-900/90 backdrop-blur border-b border-white/10 text-white px-6 py-4 shadow-md">
    <div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
      <NuxtLink to="/" class="flex items-center gap-2 text-xl font-extrabold tracking-tight hover:opacity-90 transition-opacity">
        <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-gray-900 text-sm font-black">₿</span>
        <span>CryptoPulse</span>
      </NuxtLink>

      <div class="flex items-center gap-6">
        <div class="hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
          :class="connected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'"
        >
          <span class="relative flex h-2 w-2">
            <span v-if="connected" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2" :class="connected ? 'bg-emerald-500' : 'bg-amber-500'"></span>
          </span>
          {{ connected ? 'Live' : 'Connecting…' }}
        </div>

        <div class="flex items-center gap-6">
          <NuxtLink
            to="/"
            class="hover:text-gray-300 transition-colors font-medium"
            active-class="text-emerald-400 font-semibold"
          >
            Market
          </NuxtLink>
          <NuxtLink
            to="/portfolio"
            class="hover:text-gray-300 transition-colors font-medium"
            active-class="text-emerald-400 font-semibold"
          >
            Portfolio
          </NuxtLink>
        </div>
      </div>
    </div>
  </nav>
</template>
