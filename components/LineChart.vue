<script setup lang="ts">
interface Point {
  t: number
  value: number
}

const props = withDefaults(defineProps<{
  points: Point[]
  color?: string
  height?: number
  baseline?: number
  valueFormatter?: (v: number) => string
  timeFormatter?: (t: number) => string
}>(), {
  color: '#10b981',
  height: 240,
  baseline: undefined,
  valueFormatter: (v: number) => v.toFixed(2),
  timeFormatter: (t: number) => new Date(t).toLocaleString(),
})

const VIEW_WIDTH = 600
const PAD_LEFT = 56
const PAD_RIGHT = 12
const PAD_TOP = 16
const PAD_BOTTOM = 24

const svgEl = ref<SVGSVGElement | null>(null)
const hoverIndex = ref<number | null>(null)
const tooltipFlipped = ref(false)

const domain = computed(() => {
  const values = props.points.map(p => p.value)
  if (props.baseline !== undefined) values.push(props.baseline)
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (min === max) {
    min -= 1
    max += 1
  }
  const pad = (max - min) * 0.1
  return { min: min - pad, max: max + pad }
})

const times = computed(() => props.points.map(p => p.t))
const timeDomain = computed(() => {
  const min = Math.min(...times.value)
  const max = Math.max(...times.value)
  return { min, max: max === min ? min + 1 : max }
})

function xFor(t: number) {
  const { min, max } = timeDomain.value
  const ratio = (t - min) / (max - min)
  return PAD_LEFT + ratio * (VIEW_WIDTH - PAD_LEFT - PAD_RIGHT)
}

function yFor(value: number) {
  const { min, max } = domain.value
  const ratio = (value - min) / (max - min)
  return props.height - PAD_BOTTOM - ratio * (props.height - PAD_TOP - PAD_BOTTOM)
}

const linePath = computed(() => {
  return props.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(p.t).toFixed(2)} ${yFor(p.value).toFixed(2)}`).join(' ')
})

const areaPath = computed(() => {
  if (!props.points.length) return ''
  const baseY = props.height - PAD_BOTTOM
  const first = props.points[0]
  const last = props.points[props.points.length - 1]
  const top = props.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(p.t).toFixed(2)} ${yFor(p.value).toFixed(2)}`).join(' ')
  return `${top} L ${xFor(last.t).toFixed(2)} ${baseY} L ${xFor(first.t).toFixed(2)} ${baseY} Z`
})

const gridLines = computed(() => {
  const { min, max } = domain.value
  const steps = 4
  return Array.from({ length: steps + 1 }, (_, i) => {
    const value = min + ((max - min) * i) / steps
    return { value, y: yFor(value) }
  })
})

const baselineY = computed(() => (props.baseline !== undefined ? yFor(props.baseline) : null))

const hoverPoint = computed(() => (hoverIndex.value !== null ? props.points[hoverIndex.value] : null))

function handleMove(event: PointerEvent) {
  if (!svgEl.value || !props.points.length) return
  const rect = svgEl.value.getBoundingClientRect()
  const relX = ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH
  let closest = 0
  let closestDist = Infinity
  props.points.forEach((p, i) => {
    const dist = Math.abs(xFor(p.t) - relX)
    if (dist < closestDist) {
      closestDist = dist
      closest = i
    }
  })
  hoverIndex.value = closest
  tooltipFlipped.value = relX > VIEW_WIDTH * 0.65
}

function handleLeave() {
  hoverIndex.value = null
}
</script>

<template>
  <div class="relative w-full select-none">
    <svg
      ref="svgEl"
      :viewBox="`0 0 ${VIEW_WIDTH} ${height}`"
      :style="{ height: `${height}px` }"
      class="w-full touch-none"
      @pointermove="handleMove"
      @pointerleave="handleLeave"
    >
      <line
        v-for="(g, i) in gridLines"
        :key="i"
        :x1="PAD_LEFT" :x2="VIEW_WIDTH - PAD_RIGHT" :y1="g.y" :y2="g.y"
        stroke="currentColor"
        class="text-gray-200 dark:text-gray-800"
        stroke-width="1"
      />
      <text
        v-for="(g, i) in gridLines"
        :key="`label-${i}`"
        :x="PAD_LEFT - 8" :y="g.y + 3"
        text-anchor="end"
        class="fill-gray-400 dark:fill-gray-500"
        font-size="9"
      >{{ valueFormatter(g.value) }}</text>

      <line
        v-if="baselineY !== null"
        :x1="PAD_LEFT" :x2="VIEW_WIDTH - PAD_RIGHT" :y1="baselineY" :y2="baselineY"
        stroke="currentColor"
        class="text-gray-400 dark:text-gray-600"
        stroke-width="1"
        stroke-dasharray="4 3"
      />

      <path :d="areaPath" :fill="color" fill-opacity="0.1" stroke="none" />
      <path :d="linePath" fill="none" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />

      <template v-if="hoverPoint">
        <line
          :x1="xFor(hoverPoint.t)" :x2="xFor(hoverPoint.t)"
          :y1="PAD_TOP" :y2="height - PAD_BOTTOM"
          stroke="currentColor"
          class="text-gray-300 dark:text-gray-700"
          stroke-width="1"
        />
        <circle :cx="xFor(hoverPoint.t)" :cy="yFor(hoverPoint.value)" r="4" :fill="color" stroke="white" class="dark:stroke-gray-900" stroke-width="2" />
      </template>
    </svg>

    <div
      v-if="hoverPoint"
      class="absolute top-2 pointer-events-none bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap"
      :style="{
        left: tooltipFlipped ? 'auto' : `${(xFor(hoverPoint.t) / VIEW_WIDTH) * 100}%`,
        right: tooltipFlipped ? `${100 - (xFor(hoverPoint.t) / VIEW_WIDTH) * 100}%` : 'auto',
        transform: tooltipFlipped ? 'translateX(8px)' : 'translateX(-8px) translateX(-100%)',
      }"
    >
      <div class="font-semibold font-mono">{{ valueFormatter(hoverPoint.value) }}</div>
      <div class="text-gray-300 dark:text-gray-400">{{ timeFormatter(hoverPoint.t) }}</div>
    </div>
  </div>
</template>
