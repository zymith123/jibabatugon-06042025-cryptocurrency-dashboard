import { ref, onUnmounted } from 'vue'

type SymbolPriceMap = Record<string, string>

export function useCryptoSocket() {
  const symbols = ref<string[]>([])
  const prices = ref<SymbolPriceMap>({})
  let socket: WebSocket | null = null

  const fetchSymbols = async () => {
    const res = await fetch('https://api.binance.com/api/v3/exchangeInfo')
    const data = await res.json()
    symbols.value = data.symbols
      .filter((s: any) => s.quoteAsset === 'USDT' && s.status === 'TRADING')
      .map((s: any) => s.symbol.toLowerCase())
      .sort()
  }

  const connect = () => {
    socket = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr')

    socket.onmessage = (event) => {
      const tickers = JSON.parse(event.data) as Array<any>
      for (const ticker of tickers) {
        const symbol = ticker.s.toLowerCase()
        if (symbols.value.includes(symbol)) {
          prices.value[symbol] = ticker.c
        }
      }
    }

    socket.onclose = () => {
      setTimeout(connect, 3000)
    }

    socket.onerror = (err) => {
      console.error('WebSocket error:', err)
    }
  }
  
  onMounted(async () => {
    await fetchSymbols()
    connect()
  })

  onUnmounted(() => {
    socket?.close()
  })

  return {
    symbols,
    prices,
  }
}
