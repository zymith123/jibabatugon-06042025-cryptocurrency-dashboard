<script setup lang="ts">
const { cryptoOnHold, removeCrypto } = usePortfolio()
const { tickers } = useCryptoSocket()

function currentPrice(symbol: string): number | undefined {
  return tickers.value[symbol.toLowerCase() + 'usdt']?.price
}

const rows = computed(() => {
  return cryptoOnHold.value.map((item, index) => {
    const price = currentPrice(item.symbol)
    const currentValue = price !== undefined ? price * item.quantity : undefined
    const pnl = currentValue !== undefined ? currentValue - item.total : undefined
    const pnlPercent = pnl !== undefined && item.total ? (pnl / item.total) * 100 : undefined
    return { ...item, index, currentValue, pnl, pnlPercent }
  })
})

const totalInvested = computed(() => cryptoOnHold.value.reduce((sum, item) => sum + item.total, 0))
const totalCurrentValue = computed(() => rows.value.reduce((sum, r) => sum + (r.currentValue ?? r.total), 0))
const totalPnl = computed(() => totalCurrentValue.value - totalInvested.value)
const totalPnlPercent = computed(() => (totalInvested.value ? (totalPnl.value / totalInvested.value) * 100 : 0))

function handleRemove(index: number) {
  removeCrypto(index)
  useToast().add({ title: 'Holding removed', color: 'neutral' })
}
</script>

<template>
  <div class="max-w-4xl mx-auto w-full px-4 py-10 space-y-8">
    <div class="text-center space-y-2">
      <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight">Portfolio</h1>
      <p class="text-gray-500 dark:text-gray-400">Your simulated holdings, valued in real time</p>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <UCard>
        <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Invested</p>
        <p class="text-2xl font-bold mt-1">{{ formatUsd(totalInvested) }}</p>
      </UCard>
      <UCard>
        <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Current Value</p>
        <p class="text-2xl font-bold mt-1">{{ formatUsd(totalCurrentValue) }}</p>
      </UCard>
      <UCard>
        <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">P&amp;L</p>
        <p class="text-2xl font-bold mt-1" :class="totalPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'">
          {{ totalPnl >= 0 ? '+' : '' }}{{ formatUsd(totalPnl) }}
        </p>
      </UCard>
      <UCard>
        <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">P&amp;L %</p>
        <p class="text-2xl font-bold mt-1" :class="totalPnlPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'">
          {{ formatPercent(totalPnlPercent) }}
        </p>
      </UCard>
    </div>

    <UCard v-if="rows.length" :ui="{ body: 'p-0 sm:p-0' }">
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left text-gray-500 dark:text-gray-300">
          <thead class="text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th class="px-4 py-3">Symbol</th>
              <th class="px-4 py-3">Bought Price</th>
              <th class="px-4 py-3">Amount</th>
              <th class="px-4 py-3">Invested</th>
              <th class="px-4 py-3">Current Value</th>
              <th class="px-4 py-3">P&amp;L</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in rows"
              :key="`${item.symbol}-${item.index}`"
              class="bg-white dark:bg-gray-900 border-b dark:border-gray-800 border-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
            >
              <td class="px-4 py-3 font-semibold text-gray-900 dark:text-white">{{ item.symbol }}</td>
              <td class="px-4 py-3 font-mono">{{ formatUsd(item.price) }}</td>
              <td class="px-4 py-3">{{ item.quantity }}</td>
              <td class="px-4 py-3">{{ formatUsd(item.total) }}</td>
              <td class="px-4 py-3">{{ item.currentValue !== undefined ? formatUsd(item.currentValue) : '…' }}</td>
              <td class="px-4 py-3 font-medium" :class="(item.pnl ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'">
                <span v-if="item.pnl !== undefined">
                  {{ item.pnl >= 0 ? '+' : '' }}{{ formatUsd(item.pnl) }}
                  <span class="text-xs">({{ formatPercent(item.pnlPercent) }})</span>
                </span>
                <span v-else class="text-gray-400 font-normal">…</span>
              </td>
              <td class="px-4 py-3">
                <UButton size="sm" color="error" variant="soft" @click="handleRemove(item.index)">
                  Remove
                </UButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <UCard v-else class="text-center py-14">
      <p class="text-lg font-medium text-gray-700 dark:text-gray-200">You don't have any holdings yet</p>
      <p class="text-gray-500 dark:text-gray-400 mt-1 mb-6">Buy your first coin from the market to start tracking your portfolio</p>
      <UButton to="/" color="primary">Browse Market</UButton>
    </UCard>
  </div>
</template>
