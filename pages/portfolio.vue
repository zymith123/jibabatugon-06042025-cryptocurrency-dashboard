<script setup lang="ts">
import type { Position } from '~/composables/usePortfolio'

const { balance, startingBalance, createdAt, positions, closedTrades, closePosition, resetAccount } = usePortfolio()
const { tickers } = useCryptoSocket()

const showSellModal = ref(false)
const selectedPosition = ref<Position | null>(null)
const showResetModal = ref(false)

function currentPrice(symbol: string): number | undefined {
  return tickers.value[symbol.toLowerCase() + 'usdt']?.price
}

function coinLink(symbol: string): string {
  return `/coin/${symbol.toLowerCase()}usdt`
}

const openRows = computed(() => {
  return positions.value.map((position) => {
    const price = currentPrice(position.symbol)
    const currentValue = price !== undefined ? price * position.quantity : undefined
    const pnl = currentValue !== undefined ? currentValue - position.cost : undefined
    const pnlPercent = pnl !== undefined && position.cost ? (pnl / position.cost) * 100 : undefined
    return { ...position, currentPrice: price, currentValue, pnl, pnlPercent }
  })
})

const holdingsValue = computed(() => openRows.value.reduce((sum, r) => sum + (r.currentValue ?? r.cost), 0))
const totalEquity = computed(() => balance.value + holdingsValue.value)
const unrealizedPnl = computed(() => openRows.value.reduce((sum, r) => sum + (r.pnl ?? 0), 0))
const stats = computed(() => computeTradingStats(startingBalance.value, createdAt.value, closedTrades.value))
const totalPnl = computed(() => unrealizedPnl.value + stats.value.netPnl)
const totalPnlPercent = computed(() => (startingBalance.value ? (totalPnl.value / startingBalance.value) * 100 : 0))

const equityChartPoints = computed(() => stats.value.equityCurve.map(p => ({ t: p.t, value: p.equity })))
const equityChartColor = computed(() => (totalEquity.value >= startingBalance.value ? '#10b981' : '#f43f5e'))

function openSellModal(position: Position) {
  selectedPosition.value = position
  showSellModal.value = true
}

function handleClose({ id, quantity, exitPrice }: { id: string, quantity: number, exitPrice: number }) {
  const result = closePosition(id, exitPrice, quantity)
  if (result.success) {
    const pnl = result.pnl ?? 0
    useToast().add({
      title: pnl >= 0 ? 'Position Closed — Profit' : 'Position Closed — Loss',
      description: `${pnl >= 0 ? '+' : ''}${formatUsd(pnl)}`,
      color: pnl >= 0 ? 'success' : 'error',
    })
  }
}

function handleReset(amount: number) {
  resetAccount(amount)
  useToast().add({ title: 'Account reset', description: `Balance restored to ${formatUsd(amount)}`, color: 'neutral' })
}

function formatProfitFactor(pf: number | null): string {
  if (pf === null) return '—'
  if (!Number.isFinite(pf)) return '∞'
  return pf.toFixed(2)
}
</script>

<template>
  <div class="max-w-5xl mx-auto w-full px-4 py-10 space-y-8">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="text-center sm:text-left space-y-2">
        <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight">Portfolio</h1>
        <p class="text-gray-500 dark:text-gray-400">Paper trading account · valued in real time</p>
      </div>
      <UButton color="neutral" variant="outline" @click="showResetModal = true">Reset Account</UButton>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <UCard>
        <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Cash Balance</p>
        <p class="text-xl font-bold mt-1">{{ formatUsd(balance) }}</p>
      </UCard>
      <UCard>
        <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Holdings Value</p>
        <p class="text-xl font-bold mt-1">{{ formatUsd(holdingsValue) }}</p>
      </UCard>
      <UCard>
        <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Equity</p>
        <p class="text-xl font-bold mt-1">{{ formatUsd(totalEquity) }}</p>
      </UCard>
      <UCard>
        <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total P&amp;L</p>
        <p class="text-xl font-bold mt-1" :class="totalPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'">
          {{ totalPnl >= 0 ? '+' : '' }}{{ formatUsd(totalPnl) }}
          <span class="text-sm">({{ formatPercent(totalPnlPercent) }})</span>
        </p>
      </UCard>
      <UCard>
        <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Win Rate</p>
        <p class="text-xl font-bold mt-1">{{ stats.winRate !== null ? formatPercent(stats.winRate).replace('+', '') : '—' }}</p>
      </UCard>
    </div>

    <div class="space-y-3">
      <h2 class="text-lg font-semibold">Equity Curve</h2>
      <UCard>
        <LineChart
          v-if="equityChartPoints.length > 1"
          :points="equityChartPoints"
          :color="equityChartColor"
          :baseline="startingBalance"
          :value-formatter="(v) => formatCompact(v)"
          :time-formatter="(t) => formatDateTime(t)"
        />
        <p v-else class="text-sm text-gray-500 dark:text-gray-400 text-center py-16">
          Close a trade to start plotting your equity curve
        </p>
      </UCard>
    </div>

    <div class="space-y-3">
      <h2 class="text-lg font-semibold">Performance Summary</h2>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <UCard>
          <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Trades</p>
          <p class="text-lg font-bold mt-1">{{ stats.totalTrades }}</p>
        </UCard>
        <UCard>
          <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Profit Factor</p>
          <p class="text-lg font-bold mt-1">{{ formatProfitFactor(stats.profitFactor) }}</p>
        </UCard>
        <UCard>
          <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Max Drawdown</p>
          <p class="text-lg font-bold mt-1 text-rose-500">
            {{ stats.maxDrawdown > 0 ? `-${formatUsd(stats.maxDrawdown)}` : formatUsd(0) }}
            <span class="text-sm">({{ stats.maxDrawdownPercent.toFixed(1) }}%)</span>
          </p>
        </UCard>
        <UCard>
          <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Realized P&amp;L</p>
          <p class="text-lg font-bold mt-1" :class="stats.netPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'">
            {{ stats.netPnl >= 0 ? '+' : '' }}{{ formatUsd(stats.netPnl) }}
          </p>
        </UCard>
        <UCard>
          <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Avg Win</p>
          <p class="text-lg font-bold mt-1 text-emerald-500">{{ formatUsd(stats.avgWin) }}</p>
        </UCard>
        <UCard>
          <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Avg Loss</p>
          <p class="text-lg font-bold mt-1 text-rose-500">{{ formatUsd(-stats.avgLoss) }}</p>
        </UCard>
        <UCard>
          <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Best Trade</p>
          <p class="text-lg font-bold mt-1 text-emerald-500">{{ stats.bestTrade !== null ? formatUsd(stats.bestTrade) : '—' }}</p>
        </UCard>
        <UCard>
          <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Worst Trade</p>
          <p class="text-lg font-bold mt-1 text-rose-500">{{ stats.worstTrade !== null ? formatUsd(stats.worstTrade) : '—' }}</p>
        </UCard>
      </div>
    </div>

    <div class="space-y-3">
      <h2 class="text-lg font-semibold">Open Positions</h2>
      <UCard v-if="openRows.length" :ui="{ body: 'p-0 sm:p-0' }">
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left text-gray-500 dark:text-gray-300">
            <thead class="text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th class="px-4 py-3">Symbol</th>
                <th class="px-4 py-3">Entry Price</th>
                <th class="px-4 py-3">Quantity</th>
                <th class="px-4 py-3">Cost Basis</th>
                <th class="px-4 py-3">Current Value</th>
                <th class="px-4 py-3">P&amp;L</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in openRows"
                :key="row.id"
                class="bg-white dark:bg-gray-900 border-b dark:border-gray-800 border-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
              >
                <td class="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                  <NuxtLink :to="coinLink(row.symbol)" class="hover:text-emerald-500 transition-colors">{{ row.symbol }}</NuxtLink>
                </td>
                <td class="px-4 py-3 font-mono">{{ formatUsd(row.entryPrice) }}</td>
                <td class="px-4 py-3">{{ row.quantity }}</td>
                <td class="px-4 py-3">{{ formatUsd(row.cost) }}</td>
                <td class="px-4 py-3">{{ row.currentValue !== undefined ? formatUsd(row.currentValue) : '…' }}</td>
                <td class="px-4 py-3 font-medium" :class="(row.pnl ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'">
                  <span v-if="row.pnl !== undefined">
                    {{ row.pnl >= 0 ? '+' : '' }}{{ formatUsd(row.pnl) }}
                    <span class="text-xs">({{ formatPercent(row.pnlPercent) }})</span>
                  </span>
                  <span v-else class="text-gray-400 font-normal">…</span>
                </td>
                <td class="px-4 py-3">
                  <UButton size="sm" color="error" variant="soft" @click="openSellModal(row)">
                    Close
                  </UButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
      <UCard v-else class="text-center py-14">
        <p class="text-lg font-medium text-gray-700 dark:text-gray-200">No open positions</p>
        <p class="text-gray-500 dark:text-gray-400 mt-1 mb-6">Buy your first coin from the market to open a trade</p>
        <UButton to="/" color="primary">Browse Market</UButton>
      </UCard>
    </div>

    <div v-if="closedTrades.length" class="space-y-3">
      <h2 class="text-lg font-semibold">Trade History</h2>
      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left text-gray-500 dark:text-gray-300">
            <thead class="text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th class="px-4 py-3">Symbol</th>
                <th class="px-4 py-3">Entry</th>
                <th class="px-4 py-3">Exit</th>
                <th class="px-4 py-3">Quantity</th>
                <th class="px-4 py-3">P&amp;L</th>
                <th class="px-4 py-3">Closed</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="trade in closedTrades"
                :key="trade.id"
                class="bg-white dark:bg-gray-900 border-b dark:border-gray-800 border-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
              >
                <td class="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                  <NuxtLink :to="coinLink(trade.symbol)" class="hover:text-emerald-500 transition-colors">{{ trade.symbol }}</NuxtLink>
                </td>
                <td class="px-4 py-3 font-mono">{{ formatUsd(trade.entryPrice) }}</td>
                <td class="px-4 py-3 font-mono">{{ formatUsd(trade.exitPrice) }}</td>
                <td class="px-4 py-3">{{ trade.quantity }}</td>
                <td class="px-4 py-3 font-medium" :class="trade.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'">
                  {{ trade.pnl >= 0 ? '+' : '' }}{{ formatUsd(trade.pnl) }}
                  <span class="text-xs">({{ formatPercent(trade.pnlPercent) }})</span>
                </td>
                <td class="px-4 py-3 text-xs">{{ formatDateTime(trade.closedAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </div>

    <SellModal
      :show="showSellModal"
      :position="selectedPosition"
      :current-price="selectedPosition ? currentPrice(selectedPosition.symbol) : undefined"
      @close="showSellModal = false"
      @confirm="handleClose"
    />

    <AccountSetupModal
      :show="showResetModal"
      mode="reset"
      :current-balance="startingBalance"
      @close="showResetModal = false"
      @confirm="handleReset"
    />
  </div>
</template>
