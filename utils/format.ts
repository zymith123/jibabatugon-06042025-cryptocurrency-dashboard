export function formatPrice(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  const maxDecimals = value >= 100 ? 2 : value >= 1 ? 4 : 6
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: maxDecimals })
}

export function formatUsd(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatPercent(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatCompact(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value)
}
