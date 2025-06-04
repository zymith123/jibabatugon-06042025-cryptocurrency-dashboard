<script setup lang="ts">
const props = defineProps<{
  show: boolean
  symbol: string
  price: number
}>()

const emit = defineEmits(['close', 'confirm'])

const quantity = ref(1)
const show = ref(false)

watchEffect(()=> {
  show.value = props.show
})

const total = computed(() => (quantity.value * props.price).toFixed(2))

function confirmBuy() {
  emit('confirm', {
    symbol: props.symbol,
    price: props.price,
    quantity: quantity.value,
    total: parseFloat(total.value),
  })
  emit('close')
}
</script>

<template>
  <div 
  v-if="show" 
  class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" 
  @click.self="emit('close')"
    >
    <div class="relative bg-gray-800 text-white rounded-lg p-6 w-full max-w-md shadow-lg">
      <h2 class="text-xl font-semibold mb-4">Buy {{ props.symbol }}</h2>
      <button class="absolute text-xl cursor-pointer top-2 right-2 text-gray-500 hover:text-gray text-white" @click="emit('close')">&times;</button>
      <div class="mb-4">
        <label class="block text-white text-sm font-medium text-gray-700 mb-1">Price (USD):</label>
        <div class="border text-black rounded px-3 py-2 bg-gray-100">{{ props.price }}</div>
      </div>

      <div class="mb-4">
        <label class="text-white block text-sm font-medium text-gray-700 mb-1">Quantity:</label>
        <input
          v-model.number="quantity"
          type="number"
          min="0"
          step="any"
          class="w-full border rounded px-3 py-2 text-black bg-white"
          placeholder="Enter quantity"
        />
      </div>

      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-1 text-white">Total:</label>
        <div class="border rounded px-3 py-2 bg-gray-100 text-black">{{ total }}</div>
      </div>

      <button
        class="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded"
        @click="confirmBuy()"
      >
        Buy Now
      </button>
    </div>
  </div>
</template>
