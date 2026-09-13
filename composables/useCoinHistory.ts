export interface PricePoint {
  t: number
  value: number
}

export type ChartRange = '24H' | '7D' | '30D'

const RANGE_CONFIG: Record<ChartRange, { interval: string, limit: number }> = {
  '24H': { interval: '15m', limit: 96 },
  '7D': { interval: '1h', limit: 168 },
  '30D': { interval: '4h', limit: 180 },
}

export function useCoinHistory(symbol: Ref<string>) {
  const points = ref<PricePoint[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  const range = ref<ChartRange>('7D')

  const fetchHistory = async () => {
    loading.value = true
    error.value = null
    try {
      const { interval, limit } = RANGE_CONFIG[range.value]
      const url = `https://api.binance.com/api/v3/klines?symbol=${symbol.value.toUpperCase()}&interval=${interval}&limit=${limit}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`)
      const data = await res.json() as Array<any>
      points.value = data.map(candle => ({ t: candle[0], value: parseFloat(candle[4]) }))
    } catch (err) {
      error.value = 'Unable to load price history.'
      points.value = []
    } finally {
      loading.value = false
    }
  }

  watch([symbol, range], fetchHistory, { immediate: true })

  return {
    points,
    loading,
    error,
    range,
    ranges: Object.keys(RANGE_CONFIG) as ChartRange[],
  }
}
