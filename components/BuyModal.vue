<script setup lang="ts">
const props = defineProps<{
  show: boolean
  symbol: string
  price: number
  balance: number
}>()

const emit = defineEmits(['close', 'confirm'])

const quantity = ref(1)
const show = ref(false)

watchEffect(() => {
  show.value = props.show
  if (props.show) quantity.value = props.price > 0 ? parseFloat((props.balance / props.price / 4).toFixed(8)) : 1
})

const total = computed(() => quantity.value * props.price)
const isValid = computed(() => quantity.value > 0 && Number.isFinite(quantity.value) && total.value <= props.balance)
const exceedsBalance = computed(() => quantity.value > 0 && total.value > props.balance)

function setPercent(pct: number) {
  if (!props.price) return
  quantity.value = parseFloat(((props.balance * pct) / props.price).toFixed(8))
}

function confirmBuy() {
  if (!isValid.value) return
  emit('confirm', {
    symbol: props.symbol,
    price: props.price,
    quantity: quantity.value,
    total: parseFloat(total.value.toFixed(8)),
  })
  emit('close')
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    @click.self="emit('close')"
  >
    <div class="relative bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl p-6 w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700">
      <button
        class="absolute text-xl cursor-pointer top-3 right-3 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
        @click="emit('close')"
      >
        &times;
      </button>
      <h2 class="text-xl font-bold mb-1">Buy {{ props.symbol }}</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Simulated purchase at current market price · Available: {{ formatUsd(props.balance) }}
      </p>

      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Price (USD)</label>
        <div class="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 font-mono">
          {{ formatUsd(props.price) }}
        </div>
      </div>

      <div class="mb-4">
        <div class="flex items-center justify-between mb-1">
          <label class="block text-sm font-medium text-gray-600 dark:text-gray-300">Quantity</label>
          <div class="flex gap-1">
            <button
              v-for="pct in [0.25, 0.5, 0.75, 1]"
              :key="pct"
              type="button"
              class="text-xs px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-900/30 transition-colors"
              @click="setPercent(pct)"
            >
              {{ pct === 1 ? 'Max' : `${pct * 100}%` }}
            </button>
          </div>
        </div>
        <input
          v-model.number="quantity"
          type="number"
          min="0"
          step="any"
          class="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Enter quantity"
        />
        <p v-if="quantity <= 0" class="text-xs text-rose-500 mt-1">Enter a quantity greater than 0</p>
        <p v-else-if="exceedsBalance" class="text-xs text-rose-500 mt-1">Exceeds your available balance</p>
      </div>

      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Total</label>
        <div class="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 font-mono font-semibold">
          {{ formatUsd(total) }}
        </div>
      </div>

      <button
        class="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:dark:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
        :disabled="!isValid"
        @click="confirmBuy()"
      >
        Buy Now
      </button>
    </div>
  </div>
</template>
