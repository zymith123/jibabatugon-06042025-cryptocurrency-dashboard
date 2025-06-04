<template>
  <nav class="bg-gray-900 text-white px-6 py-4 shadow-md">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <div class="text-xl font-bold">
        <NuxtLink to="/" class="hover:text-gray-300">Crypto Market</NuxtLink>
      </div>
      <div class="space-x-6">
        <NuxtLink
          to="/"
          class="hover:text-gray-300 transition-colors"
          active-class="text-blue-400 font-semibold"
        >
          Market
        </NuxtLink>
        <NuxtLink
          to="/portfolio"
          class="hover:text-gray-300 transition-colors"
          active-class="text-blue-400 font-semibold"
        >
          Portfolio
        </NuxtLink>
      </div>
    </div>
  </nav>
</template>
