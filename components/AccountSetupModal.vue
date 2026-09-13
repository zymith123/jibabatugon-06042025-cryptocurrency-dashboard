<script setup lang="ts">
const props = defineProps<{
  show: boolean
  mode: 'setup' | 'reset'
  currentBalance?: number
}>()

const emit = defineEmits(['close', 'confirm'])

const amount = ref(10000)

watchEffect(() => {
  if (props.show) amount.value = props.mode === 'reset' ? (props.currentBalance ?? 10000) : 10000
})

const isValid = computed(() => amount.value > 0 && Number.isFinite(amount.value))
const presets = [1000, 5000, 10000, 50000]

function confirm() {
  if (!isValid.value) return
  emit('confirm', amount.value)
  emit('close')
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
    @click.self="mode === 'reset' && emit('close')"
  >
    <div class="relative bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl p-6 w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700">
      <button
        v-if="mode === 'reset'"
        class="absolute text-xl cursor-pointer top-3 right-3 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
        @click="emit('close')"
      >
        &times;
      </button>

      <h2 class="text-xl font-bold mb-1">
        {{ mode === 'setup' ? 'Welcome to CryptoPulse' : 'Reset Account' }}
      </h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-5">
        {{ mode === 'setup'
          ? 'Choose how much virtual cash you want to start paper trading with.'
          : 'This clears your open positions and trade history and restores your balance to the amount below.' }}
      </p>

      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Starting Balance (USD)</label>
        <input
          v-model.number="amount"
          type="number"
          min="0"
          step="any"
          class="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p v-if="!isValid" class="text-xs text-rose-500 mt-1">Enter an amount greater than 0</p>
      </div>

      <div class="flex gap-2 mb-6">
        <button
          v-for="preset in presets"
          :key="preset"
          type="button"
          class="flex-1 text-sm px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-900/30 transition-colors"
          @click="amount = preset"
        >
          {{ formatCompact(preset) }}
        </button>
      </div>

      <button
        class="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:dark:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
        :disabled="!isValid"
        @click="confirm()"
      >
        {{ mode === 'setup' ? 'Start Trading' : 'Reset Account' }}
      </button>
    </div>
  </div>
</template>
