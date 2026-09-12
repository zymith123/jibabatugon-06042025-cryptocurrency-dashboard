import { onUnmounted } from 'vue'

export interface TickerData {
  price: number
  changePercent: number
  high: number
  low: number
  volume: number
}

let socket: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let subscriberCount = 0
let symbolSet = new Set<string>()

export function useCryptoSocket() {
  const symbols = useState<string[]>('crypto-symbols', () => [])
  const tickers = useState<Record<string, TickerData>>('crypto-tickers', () => ({}))
  const connected = useState('crypto-connected', () => false)
  const loading = useState('crypto-loading', () => true)
  const error = useState<string | null>('crypto-error', () => null)

  const fetchSymbols = async () => {
    if (symbols.value.length) return
    try {
      const res = await fetch('https://api.binance.com/api/v3/exchangeInfo')
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`)
      const data = await res.json()
      symbols.value = data.symbols
        .filter((s: any) => s.quoteAsset === 'USDT' && s.status === 'TRADING')
        .map((s: any) => s.symbol.toLowerCase())
        .sort()
      symbolSet = new Set(symbols.value)
      error.value = null
    } catch (err) {
      error.value = 'Unable to load market data. Please check your connection and try again.'
    } finally {
      loading.value = false
    }
  }

  const connect = () => {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return

    socket = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr')

    socket.onopen = () => {
      connected.value = true
    }

    socket.onmessage = (event) => {
      const tickerList = JSON.parse(event.data) as Array<any>
      for (const ticker of tickerList) {
        const symbol = ticker.s.toLowerCase()
        if (symbolSet.has(symbol)) {
          tickers.value[symbol] = {
            price: parseFloat(ticker.c),
            changePercent: parseFloat(ticker.P),
            high: parseFloat(ticker.h),
            low: parseFloat(ticker.l),
            volume: parseFloat(ticker.v),
          }
        }
      }
    }

    socket.onclose = () => {
      connected.value = false
      reconnectTimer = setTimeout(connect, 3000)
    }

    socket.onerror = () => {
      connected.value = false
    }
  }

  onMounted(async () => {
    subscriberCount++
    await fetchSymbols()
    connect()
  })

  onUnmounted(() => {
    subscriberCount--
    if (subscriberCount <= 0) {
      if (reconnectTimer) clearTimeout(reconnectTimer)
      socket?.close()
      socket = null
    }
  })

  return {
    symbols,
    tickers,
    connected,
    loading,
    error,
  }
}
