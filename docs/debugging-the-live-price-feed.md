# The Bug Where My "Live" Prices Weren't Actually Live

*A write-up from building [CryptoPulse](https://zymith123.github.io/jibabatugon-06042025-cryptocurrency-dashboard/), a crypto market dashboard and paper-trading simulator.*

## The short version

Every price on the Market page was stuck on `…`, even though the app's own status badge said "Live." I expected a broken connection. What I actually had was a connection that opened just fine and then never sent me anything — no data, no error, no disconnect. Nothing. It took some digging to figure out that a network in between my app and Binance was quietly swallowing the data after letting the handshake through. Once I understood that, the fix was simple: stop trusting one data source, and add a second one as a backup.

## What I was building

The Market page shows live prices for a few hundred crypto pairs by connecting to Binance's WebSocket feed:

```ts
socket = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr')

socket.onopen = () => { connected.value = true }
socket.onmessage = (event) => { /* parse and apply ticker updates */ }
socket.onclose = () => { connected.value = false; setTimeout(connect, 3000) }
socket.onerror = () => { connected.value = false }
```

Pretty standard stuff. It worked fine every time I tested it. Then someone else tried the app and told me every price was blank, even though the little "Live" badge in the corner was glowing green like everything was fine.

## Trying to figure out what was actually going on

My first thought was that something was blocked at the network level entirely. But that didn't hold up — the app had already pulled a real list of ~490 coins from Binance's REST API to build the price table in the first place. So Binance was reachable. Whatever was wrong was specific to the WebSocket.

Next I wanted to make sure the "Live" badge wasn't lying to me. It only turns green inside `onopen`, so if it's on, the connection genuinely opened. I asked for a screenshot of the browser's Network tab, and sure enough: status 101, "Switching Protocols" — the handshake had completed. The socket really was open.

So now I had a connection that was open, according to the browser, but delivering nothing. That's the annoying part of this kind of bug — a WebSocket failing usually looks like a failure. It errors, or it closes, or it never opens in the first place. This one did none of that. It just sat there, quiet.

## Stop guessing, start logging

At this point I didn't have enough information to have an opinion, so instead of guessing I added logging to every single thing that could happen to the socket:

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

Nothing clever here — I just wanted one question answered: after the connection opens, does *anything at all* happen next?

The answer came back a few minutes later, and it was almost funny in how little it said:

```
[crypto-socket] connection opened
```

That's it. No message log. No error. No close. Just... opened, and then silence, for as long as anyone waited.

That one line ruled out a surprising number of things at once. It wasn't a parsing bug, because `onmessage` never even fired — there was nothing to parse. It wasn't a dropped connection, because `onclose` never fired either. It wasn't my symbol-matching logic, because that code only runs once a message shows up, and none ever did.

Which left exactly one explanation: something sitting between the browser and Binance was letting the WebSocket handshake through, and then quietly dropping every message after that, without ever closing the connection. Digging around, this turned out to be a known headache with certain corporate firewalls and antivirus tools that inspect HTTPS traffic — they're built to handle normal request/response web traffic, but WebSocket is a different beast (one long-lived connection streaming frames instead of separate replies), and some of these tools just don't forward the frames correctly.

## The fix: don't put all my eggs in one basket

I couldn't do anything about someone else's firewall. What I could do was stop assuming the WebSocket was the only way to get price data. Binance also has a plain REST endpoint that returns the same prices, and it was clearly working fine — the app was already using it to get the coin list. So I added a second, independent way to refresh prices: just poll that endpoint every 10 seconds.

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

The WebSocket is still there and still does most of the work — on a normal network it updates the screen roughly once a second, way faster than any 10-second poll could. But now there's a safety net underneath it. Even in the worst case, someone's prices will still refresh, just a bit slower, using a path that's already proven to work. Both mechanisms just write into the same shared state, so neither one needs to know the other exists.

I also added a small "refresh in Xs" countdown next to the status badge, so if someone is on the slower path, the app is honest about it instead of pretending everything's instant.

## Making sure the fix actually worked

I never had access to the network that caused this in the first place, so I couldn't just "try it again and see." Instead, I recreated the exact symptom on purpose. Using Playwright, I let the REST calls respond normally but told the test to open the WebSocket connection and then never send it a single message — exactly what the logs had shown me:

```ts
await page.routeWebSocket('wss://stream.binance.com:9443/ws/!ticker@arr', ws => {
  ws.onMessage(() => {})
  // Deliberately never call ws.send(...) — mimics a connection that
  // opens but never delivers data, matching the real-world symptom.
})
```

With that setup, prices, 24-hour changes, and the gainers/losers stats all showed up correctly within 10 seconds anyway, coming entirely from the polling fallback. That told me the fix wasn't just theoretically sound — it actually held up under the same conditions that broke things the first time.

## What I took away from this

- A "connected" indicator only tells you the pipe is open, not that anything is flowing through it. If a live feed goes quiet, it's worth checking those separately instead of assuming they're the same thing.
- When you're stuck, add logging before you add opinions. One `console.log` per state told me more in five minutes than twenty minutes of guessing did.
- If a data source can fail silently and it's outside your control, don't just hope it doesn't. Give yourself a second way to get the same data, so a network hiccup somewhere becomes a minor slowdown instead of a broken feature.
- To trust a fix, try to recreate the actual failure and test against that — not just the happy path.
