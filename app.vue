<script setup lang="ts">
const { hasAccount, startAccount } = usePortfolio()
</script>

<template>
  <UApp>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <Navbar />
      <NuxtPage />
    </div>
    <AccountSetupModal
      :show="!hasAccount"
      mode="setup"
      @confirm="startAccount"
    />
  </UApp>
</template>
