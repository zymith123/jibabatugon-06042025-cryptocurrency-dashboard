# Debugging a Phantom WebSocket: When "Connected" Doesn't Mean "Receiving Data"

*A technical write-up from building [CryptoPulse](https://zymith123.github.io/jibabatugon-06042025-cryptocurrency-dashboard/), a live crypto market dashboard and paper-trading simulator.*

## TL;DR

The app's live price table streamed nothing but placeholders (`…`) even though the UI reported the market-data socket as "Live." The socket really was open — no error, no close event, nothing in the console. It just never received a single message. The root cause turned out to be a class of failure that's easy to miss because every layer *looks* healthy: a network intermediary (likely a corporate proxy or antivirus doing TLS inspection) was completing the WebSocket upgrade handshake and then silently discarding the data frames that followed. The fix was to stop treating the WebSocket as the only source of truth and add a REST-polling fallback on a fixed interval, so the app degrades gracefully instead of failing invisibly.

## Background

The Market page subscribes to Binance's combined ticker stream (`wss://stream.binance.com:9443/ws/!ticker@arr`) to show live prices and 24h change for ~500 USDT trading pairs. The connection lifecycle was straightforward:

```ts
socket = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr')

socket.onopen = () => { connected.value = true }
socket.onmessage = (event) => { /* parse and apply ticker updates */ }
socket.onclose = () => { connected.value = false; setTimeout(connect, 3000) }
socket.onerror = () => { connected.value = false }
```

This worked in every environment I tested it in — until a user reported that every row showed `…` for price and 24h change, despite the navbar showing a green "Live" badge.

## The investigation

### Step 1: Rule out a total network failure

The REST calls that seed the symbol list (`GET /api/v3/exchangeInfo`) were succeeding — the "Tracked Coins" stat showed 490, a real number pulled from Binance. So this wasn't a case of the network being fully blocked or the API being geo-restricted. Whatever was wrong was specific to the WebSocket, not to reaching Binance at all.

### Step 2: Confirm the socket state matches what the UI claims

The `connected` flag only flips to `true` inside `onopen`, so a "Live" badge is a real signal that the handshake succeeded — not a hardcoded default. I asked the user to open DevTools and check the Network tab. The connection showed **status 101 (Switching Protocols)**, confirming the WebSocket handshake completed successfully.

At this point I had two live variables that disagreed: the *transport* was healthy, but the *data* wasn't arriving. That mismatch is the interesting part of this bug — most WebSocket failures show up as a failed handshake, a close event, or an error event. This one showed none of those.

### Step 3: Instrument, don't guess

Rather than speculate further, I added structured logging to every socket event, including a one-time summary on the first message received:

```ts
socket.onopen = () => {
  connected.value = true
  console.log('[crypto-socket] connection opened')
}

socket.onmessage = (event) => {
  try {
    const tickerList = JSON.parse(event.data)
    // ...apply updates, tracking how many matched known symbols...
    if (!loggedFirstMessage) {
      loggedFirstMessage = true
      console.log(`[crypto-socket] first message: ${tickerList.length} tickers received, ${matched} matched (symbolSet size: ${symbolSet.size})`)
    }
  } catch (err) {
    console.error('[crypto-socket] failed to process message', err)
  }
}

socket.onclose = (event) => {
  connected.value = false
  console.log(`[crypto-socket] connection closed (code: ${event.code}, reason: ${event.reason || 'none'})`)
  reconnectTimer = setTimeout(connect, 3000)
}

socket.onerror = (event) => {
  connected.value = false
  console.error('[crypto-socket] connection error', event)
}
```

This is a deliberately narrow diagnostic: it answers exactly one question — *does data ever arrive, and if not, does anything at all fire on this socket after `onopen`?*

### Step 4: Read the signal

The result, after a full page load and several seconds of waiting:

```
[crypto-socket] connection opened
```

...and nothing else. No `first message` log. No `error`. No `closed`. The socket sat there, technically open, receiving zero bytes, indefinitely.

This ruled out several plausible causes at once:
- **Not a JS parsing bug** — if malformed data were arriving, `onmessage` would fire and either succeed or hit the `catch` block. Neither happened, so no data was arriving at the application layer at all.
- **Not a dropped/closed connection** — `onclose` never fired, so the TCP/TLS connection was still technically alive.
- **Not a symbol-matching bug** — that only matters once a message exists to be checked against `symbolSet`.

That left one explanation: something *between* the browser and Binance was allowing the WebSocket upgrade to complete, then filtering or buffering the subsequent data frames without ever tearing down the connection. This is a known, if under-discussed, failure mode with certain corporate proxies and antivirus products that perform TLS interception — many of them handle standard HTTPS request/response cycles correctly but mishandle long-lived, frame-based protocols like WebSocket, since the proxy has to re-implement framing and buffering rather than just relaying bytes.

## The fix: don't depend on a single transport

The pragmatic fix wasn't to chase a network configuration I don't control — it was to make the app resilient to it. Binance also exposes the same ticker data over plain REST (`GET /api/v3/ticker/24hr`), which had already proven reliable in this environment. I added a polling fallback that runs alongside the WebSocket, on a fixed interval, sharing the same update path:

```ts
const POLL_INTERVAL_MS = 10000

const pollTickers = async () => {
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/24hr')
    if (!res.ok) return
    const data = await res.json()
    for (const t of data) {
      const symbol = t.symbol.toLowerCase()
      if (symbolSet.has(symbol)) {
        tickers.value[symbol] = {
          price: parseFloat(t.lastPrice),
          changePercent: parseFloat(t.priceChangePercent),
          high: parseFloat(t.highPrice),
          low: parseFloat(t.lowPrice),
          volume: parseFloat(t.volume),
        }
      }
    }
  } catch (err) {
    console.error('[crypto-socket] REST poll failed', err)
  }
}
```

The WebSocket stays in place and still wins the race on any network where it isn't blocked — messages arrive roughly once a second, far faster than a 10-second poll. But now the app has a guaranteed floor: even in the worst case, prices refresh within 10 seconds using a transport that's already proven to work. Neither mechanism needs to know about the other; they both just write into the same reactive `tickers` state.

I also surfaced the poll cycle in the UI as a small "refresh in Xs" countdown next to the connection badge, so the 10-second worst case is communicated honestly instead of implying real-time precision the app can't always guarantee.

## Verification

Since I couldn't reproduce the blocking network locally, I verified the fix by reproducing the *symptom* instead: using Playwright, I mocked the REST endpoints to respond normally, then intercepted the WebSocket route to complete the handshake but never send a message — replicating the exact failure mode from the logs.

```ts
await page.routeWebSocket('wss://stream.binance.com:9443/ws/!ticker@arr', ws => {
  ws.onMessage(() => {})
  // Deliberately never call ws.send(...) — mimics a connection that
  // opens but never delivers data, matching the real-world symptom.
})
```

With that in place, prices, 24h change, and gainers/losers all populated correctly within 10 seconds via the polling path — confirming the fallback works independently of whatever was silently dropping frames on the original network.

## Takeaways

- **A green "connected" indicator is a claim about the transport, not about the data.** When a live feed goes quiet, check whether the *connection* is actually the thing that's broken, or whether something upstream can hold a connection open while starving it.
- **Instrument before you theorize.** A few `console.log` calls at each state transition turned a vague "it's not working" into a precise, falsifiable set of facts, which made the root cause obvious rather than guessed at.
- **Prefer layered resilience over a single "correct" transport.** Rather than treating the WebSocket as the one true source of live data, giving the app a second, independently-reliable path (REST polling) meant a network-level failure outside my control became a minor UX trade-off (10s latency) instead of a broken feature.
- **Reproduce the failure mode, not just the fix.** Since the real blocking network wasn't available to test against directly, simulating its exact behavior (handshake succeeds, zero messages) let me verify the fallback under the same conditions that exposed the original bug.
