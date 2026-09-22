# How CryptoPulse Works

*A technical walkthrough of [CryptoPulse](https://zymith123.github.io/jibabatugon-06042025-cryptocurrency-dashboard/), a crypto market dashboard and paper trading simulator built with Nuxt 3 and TypeScript.*

## What it does

CryptoPulse lets you watch live crypto prices and practice trading without risking real money. You pick a starting balance, buy and sell coins at live market prices, and the app tracks everything: open positions, closed trades, profit and loss, and a set of performance stats that show whether your trading approach actually works over time.

There's no backend and no database. Every piece of data either comes straight from Binance's public API or lives in the browser's local storage. That constraint shaped most of the interesting decisions in the app, so this is a walk through how each part works and why it's built that way.

## The data layer: getting live prices without a single point of failure

The Market page needs live prices for a few hundred trading pairs, updating continuously. The obvious approach is a WebSocket, and that's the primary source here too: the app opens one connection to Binance's combined ticker stream and reads a running feed of price updates from it.

But a single WebSocket connection is a single point of failure, and some networks (corporate proxies, certain antivirus tools doing TLS inspection) will let the connection open successfully while quietly dropping every message that comes after. So the app also polls a plain REST endpoint every 10 seconds as a backup. Both paths write into the same shared state, so the UI doesn't care which one supplied the latest price:

```ts
socket.onmessage = (event) => {
  const tickerList = JSON.parse(event.data)
  for (const ticker of tickerList) {
    const symbol = ticker.s.toLowerCase()
    if (symbolSet.has(symbol)) {
      tickers.value[symbol] = {
        price: parseFloat(ticker.c),
        changePercent: parseFloat(ticker.P),
        // ...
      }
    }
  }
}

// A second, independent path into the same state:
const pollTickers = async () => {
  const res = await fetch('https://api.binance.com/api/v3/ticker/24hr')
  const data = await res.json()
  for (const t of data) {
    tickers.value[t.symbol.toLowerCase()] = {
      price: parseFloat(t.lastPrice),
      changePercent: parseFloat(t.priceChangePercent),
      // ...
    }
  }
}
```

On a healthy connection, the WebSocket updates the screen roughly once a second, so the poll rarely matters. On a connection that's silently broken, prices still refresh every 10 seconds instead of freezing forever. Neither mechanism needs to know the other exists, which keeps the failure mode contained: worst case, the UI is a little slower, not blank.

The socket connection itself is a singleton shared across the whole app (via Nuxt's `useState`), so navigating between the Market page, a coin's detail page, and the Portfolio page doesn't open a new connection each time. Symbol lookups also run against a `Set` rather than an array, since the incoming ticker array has thousands of entries and gets checked against the tracked symbol list on every single message.

## The trading engine

Every "buy" creates a position: a record of the symbol, entry price, quantity, and total cost at the time of purchase. Positions are deliberately kept as separate lots rather than merged into one running average per coin, because that makes closing them simpler and more honest: if you buy BTC twice at different prices, you should be able to close either lot independently and see its own P&L, not an averaged one.

Closing a position (fully or partially) is where most of the actual math lives:

```ts
function closePosition(id: string, exitPrice: number, quantity?: number) {
  const position = positions.value.find(p => p.id === id)
  const qty = quantity ?? position.quantity
  const costBasis = (position.cost / position.quantity) * qty
  const proceeds = exitPrice * qty
  const pnl = proceeds - costBasis
  // ...credit the balance, record a closed trade, shrink or remove the position
}
```

The cost basis for a partial close is scaled proportionally from the original lot, so closing half a position charges it exactly half of its original cost, not half of its current value. Getting that wrong is an easy way to quietly inflate or understate P&L, and it's exactly the kind of unit mistake that's hard to spot just by looking at the UI, since the numbers still look plausible either way. Every write to the balance or a position goes through one of two functions (`buy` and `closePosition`), so there's a single place where money actually moves.

## Turning trade history into performance numbers

The Portfolio page shows more than just current holdings. It shows an equity curve and a performance summary: total trades, win rate, profit factor, max drawdown, average win and loss, and best and worst trade. All of it is derived, not stored. The only source of truth is the list of closed trades plus the account's starting balance; everything else is computed fresh from that list whenever it's needed:

```ts
function computeTradingStats(startingBalance, createdAt, closedTrades) {
  const sorted = [...closedTrades].sort((a, b) => a.closedAt - b.closedAt)

  let equity = startingBalance
  const equityCurve = [{ t: createdAt, equity }]
  for (const trade of sorted) {
    equity += trade.pnl
    equityCurve.push({ t: trade.closedAt, equity })
  }

  let peak = startingBalance
  let maxDrawdown = 0
  for (const point of equityCurve) {
    peak = Math.max(peak, point.equity)
    maxDrawdown = Math.max(maxDrawdown, peak - point.equity)
  }

  // profit factor, win rate, avg win/loss follow the same pattern:
  // walk the sorted trade list once, derive the number, never store it
}
```

Keeping this as a pure function that takes the raw trade list and returns every stat was a deliberate choice. Nothing here holds its own copy of "current profit factor" that could drift out of sync with the trades that produced it. If a trade closes, every number on the page is simply recalculated from scratch the next time it renders, which is a small enough amount of work that there's no real cost to doing it that way, and it removes an entire category of bugs where two related numbers disagree because one of them didn't get updated.

## Charts, without a charting library

Both the equity curve and each coin's price history chart are custom SVG components, not a wrapped charting library. Given the app only needed line charts with a hover tooltip, that turned out to be less code and fewer dependencies than adding one.

The chart takes an array of `{ t, value }` points, maps them into a fixed coordinate space, and builds an SVG path string from that:

```ts
function xFor(t: number) {
  const ratio = (t - timeDomain.min) / (timeDomain.max - timeDomain.min)
  return PAD_LEFT + ratio * (VIEW_WIDTH - PAD_LEFT - PAD_RIGHT)
}

const linePath = computed(() =>
  points.value.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(p.t)} ${yFor(p.value)}`).join(' ')
)
```

Hovering the chart tracks the pointer's x position, finds the nearest data point, and draws a small crosshair and tooltip at that spot. It's a fraction of the code a full charting library would bring in, and since both charts in the app share the same component, adding the equity curve's dashed "starting balance" reference line or the price chart's up/down coloring was just a couple of extra props rather than fighting a library's API to do something it wasn't built for.

## State and persistence

The whole app runs as a single-page application with server rendering turned off (`ssr: false`). That wasn't the starting point. It came out of a real bug: with SSR on, the very first render happens on the server, which has no access to the browser's local storage, so it would render as if no trading account existed yet, even for a returning user. The client would then "hydrate" onto that same wrong assumption instead of correcting it. Since literally none of the app's real data (live prices, the trading account) can exist on a server anyway, turning SSR off entirely removed that whole category of mismatch instead of working around it.

Account state (balance, open positions, closed trades) lives in Nuxt's `useState` for reactivity while the app is open, and gets mirrored into `localStorage` on every change so it survives a refresh:

```ts
const persistAll = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    balance: balance.value,
    positions: positions.value,
    closedTrades: closedTrades.value,
  }))
}
```

## Shipping it

The app builds to a static site (`nuxt generate`) and deploys to GitHub Pages through a GitHub Actions workflow that runs on every push to `main`: install, build, upload, deploy. No servers to manage, which fits a project where the only backend it ever needed was someone else's public API.

## Why build this instead of something else

I wanted a project that wasn't just a CRUD app with a form and a database. Trading logic forces you to deal with data that changes on its own schedule, math where a small unit mistake (price vs. quantity vs. total value) is easy to make and easy to miss, and a UI that has to stay correct as the ground shifts under it. That combination is what made this worth building, and it's also what made the more interesting engineering decisions (the polling fallback, the pure-function stats, dropping SSR) necessary rather than optional.
