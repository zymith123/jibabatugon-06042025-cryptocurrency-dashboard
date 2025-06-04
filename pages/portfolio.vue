<script setup lang="ts">
const { cryptoOnHold} = usePortfolio()

</script>

<template>
   <div class="max-w-3xl mx-auto p-4">
    <h1 class="text-3xl font-bold mb-6 text-center">Portfolio</h1>

    <div class="overflow-x-auto shadow rounded-lg">
      <table class="w-full text-sm text-left text-gray-500 dark:text-gray-300">
        <thead class="bg-gray-100 dark:bg-gray-700 text-xs uppercase text-gray-600 dark:text-gray-200">
          <tr>
            <th class="px-4 py-3">Symbol</th>
            <th class="px-4 py-3">Bought Price (USD)</th>
            <th class="px-4 py-3">Amount</th>
            <th class="px-4 py-3">Total Spent (USD)</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in cryptoOnHold"
            :key="item.symbol"
            class="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            <td class="px-4 py-3 font-semibold">{{ item.symbol }}</td>
            <td class="px-4 py-3">${{ item.price }}</td>
            <td class="px-4 py-3">{{ item.quantity }}</td>
            <td class="px-4 py-3 font-medium">${{ item.total }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

  