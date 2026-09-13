<script setup lang="ts">
import type { Position } from '~/composables/usePortfolio'

const props = defineProps<{
  show: boolean
  position: Position | null
  currentPrice?: number
}>()

const emit = defineEmits(['close', 'confirm'])

const quantity = ref(0)
const show = ref(false)

watchEffect(() => {
  show.value = props.show
  if (props.show && props.position) quantity.value = props.position.quantity
})

const maxQuantity = computed(() => props.position?.quantity ?? 0)
const entryPrice = computed(() => props.position?.entryPrice ?? 0)
const exitPrice = computed(() => props.currentPrice ?? entryPrice.value)

const proceeds = computed(() => quantity.value * exitPrice.value)
const costBasis = computed(() => quantity.value * entryPrice.value)
const pnl = computed(() => proceeds.value - costBasis.value)
const pnlPercent = computed(() => (costBasis.value ? (pnl.value / costBasis.value) * 100 : 0))

const isValid = computed(() => quantity.value > 0 && quantity.value <= maxQuantity.value && Number.isFinite(quantity.value))

function setPercent(pct: number) {
  quantity.value = parseFloat((maxQuantity.value * pct).toFixed(8))
}

function confirmClose() {
  if (!isValid.value || !props.position) return
  emit('confirm', {
    id: props.position.id,
    quantity: quantity.value,
    exitPrice: exitPrice.value,
  })
  emit('close')
}
</script>

<template>
  <div
    v-if="show && position"
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
      <h2 class="text-xl font-bold mb-1">Close {{ position?.symbol }} Position</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Entry {{ formatUsd(entryPrice) }} · Open quantity {{ maxQuantity }}
      </p>

      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Exit Price (USD)</label>
        <div class="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 font-mono">
          {{ formatUsd(exitPrice) }}
        </div>
      </div>

      <div class="mb-4">
        <div class="flex items-center justify-between mb-1">
          <label class="block text-sm font-medium text-gray-600 dark:text-gray-300">Quantity to Close</label>
          <div class="flex gap-1">
            <button
              v-for="pct in [0.25, 0.5, 0.75, 1]"
              :key="pct"
              type="button"
              class="text-xs px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:bg-rose-50 hover:border-rose-300 dark:hover:bg-rose-900/30 transition-colors"
              @click="setPercent(pct)"
            >
              {{ pct === 1 ? 'All' : `${pct * 100}%` }}
            </button>
          </div>
        </div>
        <input
          v-model.number="quantity"
          type="number"
          min="0"
          :max="maxQuantity"
          step="any"
          class="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
        />
        <p v-if="quantity <= 0" class="text-xs text-rose-500 mt-1">Enter a quantity greater than 0</p>
        <p v-else-if="quantity > maxQuantity" class="text-xs text-rose-500 mt-1">Cannot exceed open quantity ({{ maxQuantity }})</p>
      </div>

      <div class="mb-6 grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Proceeds</label>
          <div class="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 font-mono font-semibold">
            {{ formatUsd(proceeds) }}
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">P&amp;L</label>
          <div
            class="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 font-mono font-semibold"
            :class="pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'"
          >
            {{ pnl >= 0 ? '+' : '' }}{{ formatUsd(pnl) }} <span class="text-xs">({{ formatPercent(pnlPercent) }})</span>
          </div>
        </div>
      </div>

      <button
        class="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-gray-300 disabled:dark:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
        :disabled="!isValid"
        @click="confirmClose()"
      >
        Close Position
      </button>
    </div>
  </div>
</template>
