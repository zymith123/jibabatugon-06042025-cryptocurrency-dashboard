<script setup lang="ts">
const { symbols, tickers, loading, error } = useCryptoSocket()
const { addCrpyto } = usePortfolio()

const currentPage = ref(1)
const itemsPerPage = 10
const search = ref('')
const sortKey = ref<'name' | 'price' | 'change'>('name')
const sortDir = ref<1 | -1>(1)

const showModal = ref(false)
const selectedSymbol = ref('')
const selectedPrice = ref(0)

const allData = computed(() => {
  return symbols.value.map(symbol => {
    const t = tickers.value[symbol]
    return {
      symbol,
      name: symbol.slice(0, -4).toUpperCase(),
      price: t?.price,
      change: t?.changePercent,
    }
  })
})

const gainersCount = computed(() => allData.value.filter(d => (d.change ?? 0) > 0).length)
const losersCount = computed(() => allData.value.filter(d => (d.change ?? 0) < 0).length)
const topGainer = computed(() => {
  const withChange = allData.value.filter(d => d.change !== undefined)
  if (!withChange.length) return null
  return withChange.reduce((best, d) => (d.change! > best.change! ? d : best))
})

const fullData = computed(() => {
  let data = allData.value
  const q = search.value.trim().toLowerCase()
  if (q) data = data.filter(d => d.name.toLowerCase().includes(q))

  const dir = sortDir.value
  return [...data].sort((a, b) => {
    if (sortKey.value === 'name') return a.name.localeCompare(b.name) * dir
    if (sortKey.value === 'price') return ((a.price ?? -Infinity) - (b.price ?? -Infinity)) * dir
    return ((a.change ?? -Infinity) - (b.change ?? -Infinity)) * dir
  })
})

function setSort(key: 'name' | 'price' | 'change') {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 1 ? -1 : 1
  } else {
    sortKey.value = key
    sortDir.value = key === 'name' ? 1 : -1
  }
  currentPage.value = 1
}

watch(search, () => { currentPage.value = 1 })

function openBuyModal(symbol: string, priceProps: number) {
  selectedSymbol.value = symbol
  selectedPrice.value = priceProps
  showModal.value = true
}

function handleBuy({ symbol, price, quantity, total }: { symbol: string, price: number, quantity: number, total: number }) {
  addCrpyto(symbol, price, quantity, total)
  useToast().add({ title: 'Buy Successful', description: `Bought ${quantity} ${symbol} for ${formatUsd(total)}`, color: 'success' })
}

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return fullData.value.slice(start, start + itemsPerPage)
})

const totalPages = computed(() => Math.max(1, Math.ceil(fullData.value.length / itemsPerPage)))

function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) currentPage.value = page
}

const showingPages = computed(() => [currentPage.value - 1, currentPage.value, currentPage.value + 1])
</script>

<template>
  <div class="max-w-6xl mx-auto w-full px-4 py-10 space-y-8">
    <div class="text-center space-y-2">
      <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight">
        Crypto Market
      </h1>
      <p class="text-gray-500 dark:text-gray-400">
        Live USDT pairs streamed directly from Binance
      </p>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <UCard>
        <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Tracked Coins</p>
        <p class="text-2xl font-bold mt-1">{{ allData.length || '—' }}</p>
      </UCard>
      <UCard>
        <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Gainers</p>
        <p class="text-2xl font-bold mt-1 text-emerald-500">{{ gainersCount }}</p>
      </UCard>
      <UCard>
        <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Losers</p>
        <p class="text-2xl font-bold mt-1 text-rose-500">{{ losersCount }}</p>
      </UCard>
      <UCard>
        <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Top Gainer (24h)</p>
        <p class="text-2xl font-bold mt-1 truncate">
          <span v-if="topGainer">{{ topGainer.name }} <span class="text-emerald-500 text-base">{{ formatPercent(topGainer.change) }}</span></span>
          <span v-else class="text-gray-400">—</span>
        </p>
      </UCard>
    </div>

    <div class="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
      <UInput v-model="search" placeholder="Search coin, e.g. BTC" class="sm:max-w-xs" size="lg">
        <template #leading>
          <span class="text-gray-400">🔍</span>
        </template>
      </UInput>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        {{ fullData.length }} result{{ fullData.length === 1 ? '' : 's' }}
      </p>
    </div>

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th class="px-6 py-3 cursor-pointer select-none" @click="setSort('name')">
                Name <span v-if="sortKey === 'name'">{{ sortDir === 1 ? '▲' : '▼' }}</span>
              </th>
              <th class="px-6 py-3 cursor-pointer select-none" @click="setSort('price')">
                Price (USD) <span v-if="sortKey === 'price'">{{ sortDir === 1 ? '▲' : '▼' }}</span>
              </th>
              <th class="px-6 py-3 cursor-pointer select-none" @click="setSort('change')">
                24h % <span v-if="sortKey === 'change'">{{ sortDir === 1 ? '▲' : '▼' }}</span>
              </th>
              <th class="px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="error">
              <td colspan="4" class="px-6 py-10 text-center text-rose-500">
                {{ error }}
              </td>
            </tr>
            <template v-else-if="loading">
              <tr v-for="i in 6" :key="`skeleton-${i}`" class="border-b border-gray-100 dark:border-gray-800">
                <td class="px-6 py-4"><USkeleton class="h-4 w-16" /></td>
                <td class="px-6 py-4"><USkeleton class="h-4 w-20" /></td>
                <td class="px-6 py-4"><USkeleton class="h-4 w-14" /></td>
                <td class="px-6 py-4"><USkeleton class="h-8 w-16" /></td>
              </tr>
            </template>
            <tr v-else-if="paginatedData.length === 0">
              <td colspan="4" class="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                No coins match "{{ search }}"
              </td>
            </tr>
            <tr
              v-else
              v-for="crypto in paginatedData"
              :key="crypto.symbol"
              class="bg-white border-b dark:bg-gray-900 dark:border-gray-800 border-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
            >
              <th scope="row" class="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap dark:text-white">
                {{ crypto.name }}
              </th>
              <td class="px-6 py-4 font-mono">
                {{ crypto.price !== undefined ? formatPrice(crypto.price) : '…' }}
              </td>
              <td class="px-6 py-4">
                <span
                  v-if="crypto.change !== undefined"
                  class="font-medium"
                  :class="crypto.change >= 0 ? 'text-emerald-500' : 'text-rose-500'"
                >
                  {{ crypto.change >= 0 ? '▲' : '▼' }} {{ formatPercent(crypto.change) }}
                </span>
                <span v-else class="text-gray-400">…</span>
              </td>
              <td class="px-6 py-4">
                <UButton
                  size="sm"
                  color="primary"
                  @click="openBuyModal(crypto.name, Number(crypto.price))"
                  :disabled="crypto.price === undefined"
                >
                  Buy
                </UButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <nav class="flex items-center flex-wrap gap-3 justify-between p-4 border-t border-gray-100 dark:border-gray-800" aria-label="Table navigation">
        <span class="text-sm font-normal text-gray-500 dark:text-gray-400">
          Showing <span class="font-semibold text-gray-900 dark:text-white">{{ Math.min(currentPage * itemsPerPage, fullData.length) }}</span>
          of <span class="font-semibold text-gray-900 dark:text-white">{{ fullData.length }}</span> results
        </span>
        <ul class="inline-flex -space-x-px rtl:space-x-reverse text-sm h-8">
          <li>
            <button @click="goToPage(1)" :disabled="currentPage === 1" class="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 rounded-s-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white disabled:opacity-40 disabled:pointer-events-none">&laquo;</button>
          </li>
          <li>
            <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1" class="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white disabled:opacity-40 disabled:pointer-events-none">&lsaquo;</button>
          </li>
          <template v-for="page in showingPages" :key="page">
            <li v-if="page > 0 && page <= totalPages">
              <button
                @click="goToPage(page)"
                class="cursor-pointer flex items-center justify-center px-3 h-8 leading-tight border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-700 dark:hover:bg-gray-700 dark:hover:text-white"
                :class="page === currentPage ? 'bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-500 dark:text-white' : 'text-gray-500 bg-white dark:text-gray-400 dark:bg-gray-800'"
              >
                {{ page }}
              </button>
            </li>
          </template>
          <li>
            <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages" class="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white disabled:opacity-40 disabled:pointer-events-none">&rsaquo;</button>
          </li>
          <li>
            <button @click="goToPage(totalPages)" :disabled="currentPage === totalPages" class="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 rounded-e-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white disabled:opacity-40 disabled:pointer-events-none">&raquo;</button>
          </li>
        </ul>
      </nav>
    </UCard>

    <BuyModal
      :show="showModal"
      :symbol="selectedSymbol"
      :price="selectedPrice"
      @close="showModal = false"
      @confirm="handleBuy"
    />
  </div>
</template>
