<script setup lang="ts">
const { symbols, prices } = useCryptoSocket()
const { cryptoOnHold, addCrpyto } = usePortfolio()

const currentPage = ref(1)
const itemsPerPage = 10

const showModal = ref(false)
const selectedSymbol = ref('')
const selectedPrice = ref(0)

const fullData = computed(()=>{
  const fetchedData = symbols.value.map(symbol => {
      return ({
        name: symbol.slice(0, -4).toUpperCase(),
        price: prices.value[symbol] || '...'
      })
    }) || []
  return fetchedData
})

function openBuyModal(symbol: string, priceProps: number) {
  selectedSymbol.value = symbol
  selectedPrice.value = priceProps
  showModal.value = true
}

function handleBuy({ symbol, price, quantity, total }: { symbol: string, price: number, quantity: number, total: number }) {
  addCrpyto(symbol, price, quantity, total)
  useToast().add({ title: 'Buy Successful', description: `Bought ${quantity} ${symbol}` })
}

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return fullData.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(fullData.value.length / itemsPerPage)
})

function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const showingPages = computed(() => {
  const p = currentPage.value
  return [p-1, p, p+1]
})
</script>

<template>
  <div class="w-full space-y-4 py-10">
    <h1 class="text-3xl font-bold text-center text-white-600 dark:text-white-400 mb-6">
      Market
    </h1>
    <div class="w-200 mx-auto relative overflow-x-auto shadow-md sm:rounded-lg">
        <table class="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
            <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                    <th scope="col" class="px-6 py-3">
                        Name
                    </th>
                    <th scope="col" class="px-6 py-3">
                        Price (USD)
                    </th>
                    <th scope="col" class="px-6 py-3">
                        Action
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="crypto in paginatedData" :key="crypto.name" class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600">
                    <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                        {{ crypto.name }}
                    </th>
                    <td class="px-6 py-4">
                        {{ crypto.price }}
                    </td>
                    <td class="px-6 py-4">
                        <UButton
                          size="sm"
                          color="primary"
                          @click="openBuyModal(crypto.name, Number(crypto.price))"
                          :disabled="crypto.price === '...'"
                        >
                          Buy
                        </UButton>
                    </td>
                </tr>
            </tbody>
        </table>
        <nav class="flex items-center flex-column flex-wrap md:flex-row justify-between pt-4" aria-label="Table navigation">
            <span class="text-sm font-normal text-gray-500 dark:text-gray-400 mb-4 md:mb-0 block w-full md:inline md:w-auto">Showing <span class="font-semibold text-gray-900 dark:text-white">{{ Math.min(currentPage * itemsPerPage, fullData.length) }}</span> of <span class="font-semibold text-gray-900 dark:text-white">{{ fullData.length }}</span> results</span>
            <ul class="inline-flex -space-x-px rtl:space-x-reverse text-sm h-8">
                <li>
                    <button @click="goToPage(1)" :disabled="currentPage === 1" class="flex items-center justify-center px-3 h-8 ms-0 leading-tight text-gray-500 bg-white border border-gray-300 rounded-s-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"><<</button>
                </li>
                <li>
                    <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1" class="flex items-center justify-center px-3 h-8 ms-0 leading-tight text-gray-500 bg-white border border-gray-300 rounded-s-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"><</button>
                </li>
                <template v-for="page in showingPages" :key="page">
                  <li v-if="page > 0 && page <= totalPages">
                    <button @click="goToPage(page)" class="cursor-pointer flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-700 dark:hover:bg-gray-700 dark:hover:text-white" :class="page === currentPage ? 'dark:text-white dark:bg-gray-700' : 'dark:text-gray-400 dark:bg-gray-800'">{{ page }}</button>
                  </li>  
                </template>
                <li>
                  <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages" class="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 rounded-e-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">></button>
                </li>
                <li>
                  <button @click="goToPage(totalPages)" :disabled="currentPage === totalPages" class="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 rounded-e-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">>></button>
                </li>
            </ul>
        </nav>
    </div>
    <BuyModal
      :show="showModal"
      :symbol="selectedSymbol"
      :price="selectedPrice"
      @close="showModal = false"
      @confirm="handleBuy"
    />
  </div>
</template>

<style scoped>
</style>
  