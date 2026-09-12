export interface Position {
  id: string
  symbol: string
  entryPrice: number
  quantity: number
  cost: number
  openedAt: number
}

export interface ClosedTrade {
  id: string
  symbol: string
  entryPrice: number
  exitPrice: number
  quantity: number
  cost: number
  proceeds: number
  pnl: number
  pnlPercent: number
  openedAt: number
  closedAt: number
}

export const DEFAULT_STARTING_BALANCE = 10000
const STORAGE_KEY = 'crypto-paper-trading-v2'

interface PersistedState {
  hasAccount: boolean
  startingBalance: number
  createdAt: number
  balance: number
  positions: Position[]
  closedTrades: ClosedTrade[]
}

let idCounter = 0
function genId(): string {
  idCounter++
  return `${Date.now()}-${idCounter}`
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function loadPersisted(): PersistedState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function persist(state: PersistedState) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage unavailable (private browsing, quota) - state stays in-memory only
  }
}

export function usePortfolio() {
  const hasAccount = useState<boolean>('paper-has-account', () => loadPersisted()?.hasAccount ?? false)
  const startingBalance = useState<number>('paper-starting-balance', () => loadPersisted()?.startingBalance ?? DEFAULT_STARTING_BALANCE)
  const createdAt = useState<number>('paper-created-at', () => loadPersisted()?.createdAt ?? Date.now())
  const balance = useState<number>('paper-balance', () => loadPersisted()?.balance ?? DEFAULT_STARTING_BALANCE)
  const positions = useState<Position[]>('paper-positions', () => loadPersisted()?.positions ?? [])
  const closedTrades = useState<ClosedTrade[]>('paper-closed-trades', () => loadPersisted()?.closedTrades ?? [])

  const persistAll = () => persist({
    hasAccount: hasAccount.value,
    startingBalance: startingBalance.value,
    createdAt: createdAt.value,
    balance: balance.value,
    positions: positions.value,
    closedTrades: closedTrades.value,
  })

  function startAccount(amount: number) {
    hasAccount.value = true
    startingBalance.value = amount
    createdAt.value = Date.now()
    balance.value = amount
    positions.value = []
    closedTrades.value = []
    persistAll()
  }

  function buy(symbol: string, price: number, quantity: number): { success: boolean, message?: string } {
    const cost = round2(price * quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) return { success: false, message: 'Enter a quantity greater than 0' }
    if (cost > balance.value) return { success: false, message: 'Insufficient balance for this trade' }

    balance.value = round2(balance.value - cost)
    positions.value.push({
      id: genId(),
      symbol,
      entryPrice: price,
      quantity,
      cost,
      openedAt: Date.now(),
    })
    persistAll()
    return { success: true }
  }

  function closePosition(id: string, exitPrice: number, quantity?: number): { success: boolean, pnl?: number, message?: string } {
    const index = positions.value.findIndex(p => p.id === id)
    if (index === -1) return { success: false, message: 'Position not found' }

    const position = positions.value[index]
    const qty = quantity !== undefined && quantity > 0 && quantity < position.quantity ? quantity : position.quantity
    const costBasis = round2((position.cost / position.quantity) * qty)
    const proceeds = round2(exitPrice * qty)
    const pnl = round2(proceeds - costBasis)
    const pnlPercent = costBasis ? (pnl / costBasis) * 100 : 0

    balance.value = round2(balance.value + proceeds)

    closedTrades.value.unshift({
      id: genId(),
      symbol: position.symbol,
      entryPrice: position.entryPrice,
      exitPrice,
      quantity: qty,
      cost: costBasis,
      proceeds,
      pnl,
      pnlPercent,
      openedAt: position.openedAt,
      closedAt: Date.now(),
    })

    if (qty >= position.quantity) {
      positions.value.splice(index, 1)
    } else {
      position.quantity = round2(position.quantity - qty)
      position.cost = round2(position.cost - costBasis)
    }
    persistAll()
    return { success: true, pnl }
  }

  function resetAccount(amount: number) {
    startAccount(amount)
  }

  return {
    hasAccount,
    startingBalance,
    createdAt,
    balance,
    positions,
    closedTrades,
    startAccount,
    buy,
    closePosition,
    resetAccount,
  }
}
