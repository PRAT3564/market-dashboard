// ============================================================
// MARKET DASHBOARD
// ============================================================

// -------------------------
// Metals
// -------------------------
const METALS = [
  { key: "XAU", name: "Gold", unit: "per troy oz", cls: "metal" },
  { key: "XAG", name: "Silver", unit: "per troy oz", cls: "silver" },
];

// -------------------------
// Indices
// MSN Money symbols
// -------------------------
const INDICES = [
  { symbol: "INX",   name: "S&P 500",   sub: "US",    source: "local", jsonUrl: "us_indices.json", jsonKey: "SPX500" },
  { symbol: "COMP",  name: "Nasdaq",    sub: "US",    source: "local", jsonUrl: "us_indices.json", jsonKey: "NAS100" },
  { symbol: "NIFTY", name: "Nifty 50",  sub: "India", source: "local", jsonUrl: "indian_indices.json", jsonKey: "nifty50" },
  { symbol: "SENSEX", name: "Sensex",   sub: "India", source: "local", jsonUrl: "indian_indices.json", jsonKey: "sensex" },
];

// -------------------------
// DOM
// -------------------------
const metalsGrid = document.getElementById("metalsGrid");
const indicesGrid = document.getElementById("indicesGrid");
const lastUpdatedEl = document.getElementById("lastUpdated");
const countdownEl = document.getElementById("countdown");
const refreshBtn = document.getElementById("refreshBtn");
const tickerTrack = document.getElementById("tickerTrack");

// -------------------------
// State
// -------------------------
let latestValues = {};
let usdInrRate = null;
let refreshInProgress = false;
let localDataCache = {}; // keyed by jsonUrl

let secondsLeft = 1800;
let countdownTimer = null;


// ============================================================
// HELPERS
// ============================================================

function cardId(key) {
  return "card-" + key.replace(/[^a-zA-Z0-9]/g, "");
}

function fmt(num, digits = 2) {
  if (num === null || num === undefined || isNaN(num)) {
    return "—";
  }

  return Number(num).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}


// ============================================================
// RENDER SKELETON
// ============================================================

function renderSkeleton() {

  metalsGrid.innerHTML = METALS.map(m => `
    <div class="card ${m.cls}" id="${cardId(m.key)}">
      <div class="card-top">
        <div>
          <div class="card-name">${m.name}</div>
          <div class="card-sub">${m.unit}</div>
        </div>
      </div>

      <div class="card-price loading">
        loading…
      </div>
    </div>
  `).join("");


  indicesGrid.innerHTML = INDICES.map(i => `
    <div class="card" id="${cardId(i.symbol)}">
      <div class="card-top">
        <div>
          <div class="card-name">${i.name}</div>
          <div class="card-sub">${i.sub}</div>
        </div>
      </div>

      <div class="card-price loading">
        loading…
      </div>
    </div>
  `).join("");
}


// ============================================================
// GENERIC CARD RENDER
// ============================================================

function renderCardValue(id, priceText, changePct, subText) {

  const el = document.getElementById(id);

  if (!el) return;

  const dir =
    changePct > 0 ? "up" :
    changePct < 0 ? "down" :
    "flat";

  const arrow =
    dir === "up" ? "▲" :
    dir === "down" ? "▼" :
    "•";

  const name =
    el.querySelector(".card-name")?.textContent || "";

  el.innerHTML = `
    <div class="card-top">
      <div>
        <div class="card-name">${name}</div>
        <div class="card-sub">${subText}</div>
      </div>
    </div>

    <div class="card-price">
      ${priceText}
    </div>

    <div class="card-change ${dir}">
      ${arrow}
      ${
        changePct === null || changePct === undefined
          ? "—"
          : Math.abs(changePct).toFixed(2) + "%"
      }
    </div>
  `;
}


// ============================================================
// ERROR CARD
// ============================================================

function renderCardError(id, name, sub, retryFn) {

  const el = document.getElementById(id);

  if (!el) return;

  el.innerHTML = `
    <div class="card-top">
      <div>
        <div class="card-name">${name}</div>
        <div class="card-sub">${sub}</div>
      </div>
    </div>

    <div class="card-error">
      <span>unavailable</span>
      <button class="retry-btn">retry</button>
    </div>
  `;

  const retryButton = el.querySelector(".retry-btn");

  retryButton.addEventListener("click", retryFn);
}


// ============================================================
// TIMEOUT FETCH
// ============================================================

async function fetchWithTimeout(url, timeout = 8000) {

  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {

    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store"
    });

    return response;

  } finally {

    clearTimeout(timer);
  }
}


// ============================================================
// USD / INR
// ============================================================

async function fetchUsdInr() {

  if (usdInrRate !== null) {
    return usdInrRate;
  }

  const url =
    "https://api.frankfurter.dev/v2/rate/USD/INR";

  const res =
    await fetchWithTimeout(url, 8000);

  if (!res.ok) {
    throw new Error("USD/INR request failed");
  }

  const data = await res.json();

  if (!data.rate) {
    throw new Error("USD/INR rate missing");
  }

  usdInrRate = Number(data.rate);

  return usdInrRate;
}


// ============================================================
// METALS
// ============================================================

async function fetchMetal(m) {

  const id = cardId(m.key);

  try {

    const url =
      `https://api.gold-api.com/price/${m.key}`;

    const res =
      await fetchWithTimeout(url, 8000);

    if (!res.ok) {
      throw new Error("Metal API failed");
    }

    const data = await res.json();

    const usdPrice = Number(data.price);

    if (!usdPrice) {
      throw new Error("Metal price missing");
    }

    let inrPrice = null;

    try {

      const rate = await fetchUsdInr();

      inrPrice =
        usdPrice * rate;

    } catch (fxError) {

      console.warn(
        "USD/INR unavailable:",
        fxError
      );
    }


    const el =
      document.getElementById(id);

    if (!el) return;


    const name =
      el.querySelector(".card-name")?.textContent ||
      m.name;


    el.innerHTML = `
      <div class="card-top">
        <div>
          <div class="card-name">${name}</div>
          <div class="card-sub">${m.unit}</div>
        </div>
      </div>

      <div class="card-price">
        $${fmt(usdPrice)}
      </div>

      <div class="metal-label">
        USD
      </div>

      ${
        inrPrice !== null
          ? `
            <div class="metal-inr">
              ₹${fmt(inrPrice)}
            </div>

            <div class="metal-label">
              INR
            </div>
          `
          : ""
      }
    `;


    latestValues[m.name] = {
      price: "$" + fmt(usdPrice),
      change: null
    };


  } catch (error) {

    console.error(
      `${m.name} failed:`,
      error
    );

    renderCardError(
      id,
      m.name,
      m.unit,
      () => fetchMetal(m)
    );

    latestValues[m.name] = {
      price: "—",
      change: null
    };
  }
}


// ============================================================
// MSN MONEY
// ============================================================

async function fetchMsnIndex(idx) {

  const id = cardId(idx.symbol);

  try {

    const url =
      "https://finance-services.msn.com/Market.svc/ChartAndQuotes" +
      `?symbols=${encodeURIComponent(idx.symbol)}` +
      "&chartType=1d" +
      "&isEOD=False" +
      "&isCS=true" +
      "&isVol=false";


    const res =
      await fetchWithTimeout(url, 8000);

    if (!res.ok) {
      throw new Error(
        `MSN HTTP ${res.status}`
      );
    }

    const data =
      await res.json();


    // MSN response:
    // Chart.Series -> [{ T, Op, Hp, Lp, P, V }, ...]
    const series =
      data?.Chart?.Series;


    if (!Array.isArray(series) ||
        series.length === 0) {

      throw new Error(
        "MSN returned no chart data"
      );
    }


    // Latest valid price
    const validSeries =
      series.filter(
        item =>
          item.P !== null &&
          item.P !== undefined &&
          !isNaN(Number(item.P))
      );


    if (validSeries.length === 0) {

      throw new Error(
        "MSN price unavailable"
      );
    }


    const latest =
      validSeries[validSeries.length - 1];


    const price =
      Number(latest.P);


    // Previous price
    let previous = null;

    if (validSeries.length >= 2) {

      previous =
        Number(
          validSeries[validSeries.length - 2].P
        );
    }


    let changePct = null;

    if (
      previous !== null &&
      previous !== 0
    ) {

      changePct =
        ((price - previous) / previous) * 100;
    }


    renderCardValue(
      id,
      fmt(price),
      changePct,
      idx.sub
    );


    latestValues[idx.name] = {
      price: fmt(price),
      change: changePct
    };


  } catch (error) {

    console.error(
      `${idx.name} failed:`,
      error
    );


    renderCardError(
      id,
      idx.name,
      idx.sub,
      () => fetchMsnIndex(idx)
    );


    latestValues[idx.name] = {
      price: "—",
      change: null
    };
  }
}


// ============================================================
// LOCAL JSON DATA FEEDS
// indian_indices.json  -> Indian indices (Sensex, Nifty 50)
// us_indices.json   -> US indices (S&P 500, Nasdaq)
// ============================================================

async function fetchLocalMarketData(jsonUrl) {

  if (localDataCache[jsonUrl]) {
    return localDataCache[jsonUrl];
  }

  const res =
    await fetchWithTimeout(jsonUrl, 8000);

  if (!res.ok) {
    throw new Error(`${jsonUrl} request failed`);
  }

  const data = await res.json();

  if (!data.indices) {
    throw new Error(`${jsonUrl} missing indices`);
  }

  localDataCache[jsonUrl] = data;

  return data;
}


async function fetchLocalIndex(idx) {

  const id = cardId(idx.symbol);

  try {

    const data =
      await fetchLocalMarketData(idx.jsonUrl);

    const entry =
      data.indices?.[idx.jsonKey];

    if (
      !entry ||
      entry.price === undefined ||
      entry.price === null ||
      isNaN(Number(entry.price))
    ) {
      throw new Error(
        `No data for ${idx.jsonKey} in ${idx.jsonUrl}`
      );
    }

    const price =
      Number(entry.price);

    const changePct =
      entry.change_percent !== undefined &&
      entry.change_percent !== null &&
      !isNaN(Number(entry.change_percent))
        ? Number(entry.change_percent)
        : null;

    renderCardValue(
      id,
      fmt(price),
      changePct,
      idx.sub
    );

    latestValues[idx.name] = {
      price: fmt(price),
      change: changePct
    };


  } catch (error) {

    console.error(
      `${idx.name} failed:`,
      error
    );

    renderCardError(
      id,
      idx.name,
      idx.sub,
      () => fetchLocalIndex(idx)
    );

    latestValues[idx.name] = {
      price: "—",
      change: null
    };
  }
}


// ============================================================
// TICKER
// ============================================================

function updateTicker() {

  const parts =
    Object.entries(latestValues)
      .map(([name, v]) => {

        const dir =
          v.change > 0
            ? "up"
            : v.change < 0
              ? "down"
              : "";


        const chg =
          v.change === null ||
          v.change === undefined
            ? ""
            : `
              <span class="chg ${dir}">
                ${
                  v.change > 0
                    ? "▲"
                    : v.change < 0
                      ? "▼"
                      : "•"
                }
                ${Math.abs(v.change).toFixed(2)}%
              </span>
            `;


        return `
          <span class="ticker-item">
            <b>${name}</b>
            ${v.price}
            ${chg}
          </span>
        `;
      })
      .join("");


  tickerTrack.innerHTML =
    parts + parts;
}


// ============================================================
// COUNTDOWN
// ============================================================

function resetCountdown() {

  secondsLeft = 10800;

  countdownEl.textContent =
    "next sync in 03:00:00";
}


function tickCountdown() {

  if (refreshInProgress) {
    return;
  }


  if (secondsLeft <= 0) {

    secondsLeft = 10800;

    refreshAll(false);

    return;
  }


  secondsLeft--;


  const hours = Math.floor(secondsLeft / 3600)
  .toString()
  .padStart(2, "0");

const minutes = Math.floor((secondsLeft % 3600) / 60)
  .toString()
  .padStart(2, "0");

const seconds = (secondsLeft % 60)
  .toString()
  .padStart(2, "0");

countdownEl.textContent =
  `next sync in ${hours}:${minutes}:${seconds}`;
}


// ============================================================
// REFRESH ALL
// ============================================================

async function refreshAll(manual = false) {

  // Prevent multiple simultaneous refreshes
  if (refreshInProgress) {
    return;
  }


  refreshInProgress = true;

  // Re-read local JSON feeds on every refresh instead of reusing
  // stale in-memory copies
  localDataCache = {};

  if (manual) {

    refreshBtn.classList.add(
      "spinning"
    );

    refreshBtn.textContent =
      "Syncing…";
  }


  try {

    // Run requests independently.
    // One failing API won't stop the others.

    await Promise.allSettled([

      ...METALS.map(
        metal => fetchMetal(metal)
      ),

      ...INDICES.map(
        index =>
          index.source === "local"
            ? fetchLocalIndex(index)
            : fetchMsnIndex(index)
      )
    ]);


    updateTicker();


    const now =
      new Date();


    lastUpdatedEl.textContent =
      "updated " +
      now.toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      );


    resetCountdown();


  } catch (error) {

    console.error(
      "Refresh error:",
      error
    );


  } finally {

    refreshInProgress = false;


    if (manual) {

      refreshBtn.classList.remove(
        "spinning"
      );

      refreshBtn.textContent =
        "Refresh";
    }
  }
}


// ============================================================
// INITIALIZE
// ============================================================

renderSkeleton();

refreshAll(false);

countdownTimer =
  setInterval(
    tickCountdown,
    1000
  );