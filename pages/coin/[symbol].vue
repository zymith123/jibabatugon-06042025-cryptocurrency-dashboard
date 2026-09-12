<script setup lang="ts">
const route = useRoute()
const marketSymbol = computed(() => String(route.params.symbol).toLowerCase())
const displayName = computed(() => marketSymbol.value.endsWith('usdt') ? marketSymbol.value.slice(0, -4).toUpperCase() : marketSymbol.value.toUpperCase())

const { tickers, loading: tickersLoading } = useCryptoSocket()
const { balance, buy } = usePortfolio()

const ticker = computed(() => tickers.value[marketSymbol.value])
const currentPrice = computed(() => ticker.value?.price)

const symbolRef = computed(() => marketSymbol.value)
const { points, loading: chartLoading, error: chartError, range, ranges } = useCoinHistory(symbolRef)

const chartColor = computed(() => {
  if (points.value.length < 2) return '#10b981'
  const trend = points.value[points.value.length - 1].value - points.value[0].value
  return trend >= 0 ? '#10b981' : '#f43f5e'
})

const periodChangePercent = computed(() => {
  if (points.value.length < 2) return undefined
  const first = points.value[0].value
  const last = points.value[points.value.length - 1].value
  return first ? ((last - first) / first) * 100 : undefined
})

const showBuyModal = ref(false)

function handleBuy({ symbol, price, quantity, total }: { symbol: string, price: number, quantity: number, total: number }) {
  const result = buy(symbol, price, quantity)
  if (result.success) {
    useToast().add({ title: 'Buy Successful', description: `Bought ${quantity} ${symbol} for ${formatUsd(total)}`, color: 'success' })
  } else {
    useToast().add({ title: 'Buy Failed', description: result.message, color: 'error' })
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto w-full px-4 py-10 space-y-6">
    <NuxtLink to="/" class="text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-500 transition-colors">&larr; Back to Market</NuxtLink>

    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div>
        <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight">{{ displayName }}<span class="text-gray-400 dark:text-gray-500 font-medium">/USDT</span></h1>
        <div class="flex items-center gap-3 mt-2">
          <span class="text-2xl font-mono font-semibold">{{ currentPrice !== undefined ? formatPrice(currentPrice) : '…' }}</span>
          <span
            v-if="ticker?.changePercent !== undefined"
            class="text-sm font-medium px-2 py-0.5 rounded-full"
            :class="ticker.changePercent >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'"
          >
            {{ ticker.changePercent >= 0 ? '▲' : '▼' }} {{ formatPercent(ticker.changePercent) }} (24h)
          </span>
        </div>
      </div>
      <UButton size="lg" color="primary" :disabled="currentPrice === undefined" @click="showBuyModal = true">
        Buy {{ displayName }}
      </UButton>
    </div>

    <UCard>
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="font-semibold">Price Chart</h2>
          <p v-if="periodChangePercent !== undefined" class="text-xs text-gray-500 dark:text-gray-400">
            {{ range }} change:
            <span :class="periodChangePercent >= 0 ? 'text-emerald-500' : 'text-rose-500'" class="font-medium">
              {{ formatPercent(periodChangePercent) }}
            </span>
          </p>
        </div>
        <div class="flex gap-1">
          <button
            v-for="r in ranges"
            :key="r"
            type="button"
            class="text-xs px-2.5 py-1 rounded-lg border transition-colors"
            :class="range === r
              ? 'bg-emerald-500 text-white border-emerald-500'
              : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'"
            @click="range = r"
          >
            {{ r }}
          </button>
        </div>
      </div>

      <div v-if="chartError" class="h-60 flex items-center justify-center text-rose-500 text-sm">{{ chartError }}</div>
      <div v-else-if="chartLoading" class="h-60 flex items-center justify-center">
        <USkeleton class="h-48 w-full" />
      </div>
      <LineChart
        v-else
        :points="points"
        :color="chartColor"
        :value-formatter="(v) => formatPrice(v)"
        :time-formatter="(t) => new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })"
      />
    </UCard>

    <BuyModal
      :show="showBuyModal"
      :symbol="displayName"
      :price="currentPrice ?? 0"
      :balance="balance"
      @close="showBuyModal = false"
      @confirm="handleBuy"
    />
  </div>
</template>
