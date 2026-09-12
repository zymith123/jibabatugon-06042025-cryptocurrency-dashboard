import type { ClosedTrade } from '~/composables/usePortfolio'

export interface EquityPoint {
  t: number
  equity: number
}

export interface TradingStats {
  equityCurve: EquityPoint[]
  totalTrades: number
  winRate: number | null
  profitFactor: number | null // null = no trades yet, Infinity = no losing trades
  maxDrawdown: number
  maxDrawdownPercent: number
  grossProfit: number
  grossLoss: number
  avgWin: number
  avgLoss: number
  bestTrade: number | null
  worstTrade: number | null
  netPnl: number
}

export function computeTradingStats(startingBalance: number, createdAt: number, closedTrades: ClosedTrade[]): TradingStats {
  const sorted = [...closedTrades].sort((a, b) => a.closedAt - b.closedAt)

  const equityCurve: EquityPoint[] = [{ t: createdAt, equity: startingBalance }]
  let equity = startingBalance
  for (const trade of sorted) {
    equity += trade.pnl
    equityCurve.push({ t: trade.closedAt, equity })
  }

  let peak = startingBalance
  let maxDrawdown = 0
  let maxDrawdownPercent = 0
  for (const point of equityCurve) {
    if (point.equity > peak) peak = point.equity
    const drawdown = peak - point.equity
    const drawdownPercent = peak ? (drawdown / peak) * 100 : 0
    if (drawdown > maxDrawdown) maxDrawdown = drawdown
    if (drawdownPercent > maxDrawdownPercent) maxDrawdownPercent = drawdownPercent
  }

  const wins = sorted.filter(t => t.pnl > 0)
  const losses = sorted.filter(t => t.pnl < 0)
  const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0)
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0))

  return {
    equityCurve,
    totalTrades: sorted.length,
    winRate: sorted.length ? (wins.length / sorted.length) * 100 : null,
    profitFactor: sorted.length === 0 ? null : (grossLoss > 0 ? grossProfit / grossLoss : Infinity),
    maxDrawdown,
    maxDrawdownPercent,
    grossProfit,
    grossLoss,
    avgWin: wins.length ? grossProfit / wins.length : 0,
    avgLoss: losses.length ? grossLoss / losses.length : 0,
    bestTrade: sorted.length ? Math.max(...sorted.map(t => t.pnl)) : null,
    worstTrade: sorted.length ? Math.min(...sorted.map(t => t.pnl)) : null,
    netPnl: sorted.reduce((sum, t) => sum + t.pnl, 0),
  }
}
