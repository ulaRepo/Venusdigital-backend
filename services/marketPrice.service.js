const TradingAsset = require('../models/TradingAsset');

const COINGECKO_PUBLIC_URL = 'https://api.coingecko.com/api/v3';
const COINGECKO_PRO_URL = 'https://pro-api.coingecko.com/api/v3';
const TWELVE_DATA_URL = 'https://api.twelvedata.com';

let refreshInProgress = false;

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeProvider(value) {
  const source = String(value || '').trim().toLowerCase();

  if (['coingecko', 'coin_gecko', 'coin-gecko', 'cg'].includes(source)) {
    return 'coingecko';
  }

  if (['twelvedata', 'twelve_data', 'twelve-data', 'td'].includes(source)) {
    return 'twelvedata';
  }

  return source;
}

function resolveProvider(asset) {
  const explicit = normalizeProvider(asset.data_source);

  if (explicit === 'coingecko' || explicit === 'twelvedata') {
    return explicit;
  }

  if (asset.coingecko_id) {
    return 'coingecko';
  }

  if (asset.twelvedata_symbol) {
    return 'twelvedata';
  }

  const assetClass = String(asset.asset_class || '').toLowerCase();

  if (assetClass === 'crypto' && asset.external_id) {
    return 'coingecko';
  }

  if (['stock', 'stocks', 'forex', 'etf', 'index', 'indices'].includes(assetClass) && asset.external_id) {
    return 'twelvedata';
  }

  return null;
}

function resolveCoinGeckoId(asset) {
  return String(asset.coingecko_id || asset.external_id || '').trim();
}

function resolveTwelveDataSymbol(asset) {
  return String(asset.twelvedata_symbol || asset.external_id || asset.symbol || '').trim();
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      Accept: 'application/json',
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(Number(process.env.MARKET_PRICE_HTTP_TIMEOUT_MS || 15000))
  });

  const text = await response.text();
  let body;

  try {
    body = text ? JSON.parse(text) : {};
  } catch (error) {
    throw new Error(`Market provider returned invalid JSON (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    const providerMessage = body?.error || body?.message || body?.status?.message;
    throw new Error(providerMessage || `Market provider request failed with HTTP ${response.status}.`);
  }

  if (body?.status === 'error') {
    throw new Error(body.message || 'Market provider returned an error.');
  }

  return body;
}

async function fetchCoinGeckoPrices(assets) {
  const ids = assets
    .map(resolveCoinGeckoId)
    .filter(Boolean);

  if (!ids.length) {
    return new Map();
  }

  const uniqueIds = [...new Set(ids)];
  const query = new URLSearchParams({
    ids: uniqueIds.join(','),
    vs_currencies: 'usd',
    include_market_cap: 'true',
    include_24hr_vol: 'true',
    include_24hr_change: 'true',
    include_last_updated_at: 'true'
  });

  const apiKey = String(process.env.COINGECKO_API_KEY || '').trim();
  const apiPlan = String(process.env.COINGECKO_API_PLAN || 'demo').trim().toLowerCase();
  const usePro = apiKey && apiPlan === 'pro';
  const baseUrl = usePro ? COINGECKO_PRO_URL : COINGECKO_PUBLIC_URL;
  const headers = apiKey
    ? { [usePro ? 'x-cg-pro-api-key' : 'x-cg-demo-api-key']: apiKey }
    : {};

  const body = await fetchJson(`${baseUrl}/simple/price?${query.toString()}`, { headers });
  const result = new Map();

  for (const id of uniqueIds) {
    const row = body[id];

    if (!row || numberOrNull(row.usd) === null) {
      continue;
    }

    result.set(id, {
      price: numberOrNull(row.usd),
      price_change_pct_24h: numberOrNull(row.usd_24h_change) ?? 0,
      change_24h: numberOrNull(row.usd_24h_change) ?? 0,
      volume_24h: numberOrNull(row.usd_24h_vol) ?? 0,
      market_cap: numberOrNull(row.usd_market_cap) ?? 0,
      provider_updated_at: row.last_updated_at ? new Date(Number(row.last_updated_at) * 1000) : new Date()
    });
  }

  return result;
}

async function fetchTwelveDataPrices(assets) {
  const symbols = assets
    .map(resolveTwelveDataSymbol)
    .filter(Boolean);

  if (!symbols.length) {
    return new Map();
  }

  const uniqueSymbols = [...new Set(symbols)];
  const apiKey = String(process.env.TWELVE_DATA_API_KEY || '').trim();

  if (!apiKey) {
    throw new Error('TWELVE_DATA_API_KEY is not configured.');
  }

  const query = new URLSearchParams({
    symbol: uniqueSymbols.join(','),
    apikey: apiKey
  });

  const body = await fetchJson(`${TWELVE_DATA_URL}/quote?${query.toString()}`);
  const result = new Map();

  if (uniqueSymbols.length === 1 && body && body.price !== undefined) {
    result.set(uniqueSymbols[0], normalizeTwelveDataQuote(body));
    return result;
  }

  for (const symbol of uniqueSymbols) {
    const row = body?.[symbol];

    if (row && typeof row === 'object') {
      const normalized = normalizeTwelveDataQuote(row);

      if (normalized.price !== null) {
        result.set(symbol, normalized);
      }
    }
  }

  return result;
}

function normalizeTwelveDataQuote(row) {
  const price = numberOrNull(row.price ?? row.close ?? row.last);
  const percentChange = numberOrNull(row.percent_change ?? row.percentChange);
  const change = numberOrNull(row.change);

  return {
    price,
    price_change_pct_24h: percentChange ?? 0,
    change_24h: change ?? 0,
    high_24h: numberOrNull(row.high) ?? 0,
    low_24h: numberOrNull(row.low) ?? 0,
    volume_24h: numberOrNull(row.volume) ?? 0,
    provider_updated_at: row.datetime ? new Date(row.datetime) : new Date()
  };
}

async function applyMarketData(asset, data, provider) {
  if (!data || data.price === null) {
    throw new Error(`No live price was returned for ${asset.symbol}.`);
  }

  asset.price = data.price;
  asset.price_change_24h = data.change_24h ?? asset.price_change_24h ?? 0;
  asset.change_24h = data.change_24h ?? asset.change_24h ?? 0;
  asset.price_change_pct_24h = data.price_change_pct_24h ?? asset.price_change_pct_24h ?? 0;

  if (data.high_24h !== undefined && data.high_24h !== null) {
    asset.high_24h = data.high_24h;
  }

  if (data.low_24h !== undefined && data.low_24h !== null) {
    asset.low_24h = data.low_24h;
  }

  if (data.volume_24h !== undefined && data.volume_24h !== null) {
    asset.volume_24h = data.volume_24h;
  }

  if (data.market_cap !== undefined && data.market_cap !== null) {
    asset.market_cap = data.market_cap;
  }

  asset.data_source = provider;
  await asset.save();

  return asset.toObject();
}

async function refreshAsset(assetOrId) {
  const asset = typeof assetOrId === 'object' && assetOrId?._id
    ? assetOrId
    : await TradingAsset.findById(assetOrId);

  if (!asset) {
    throw new Error('Asset not found.');
  }

  const provider = resolveProvider(asset);

  if (!provider) {
    throw new Error(`${asset.symbol} has no configured live market provider. Set data_source and its provider ID/symbol.`);
  }

  if (provider === 'coingecko') {
    const id = resolveCoinGeckoId(asset);
    const data = await fetchCoinGeckoPrices([asset]);
    const row = data.get(id);
    return applyMarketData(asset, row, provider);
  }

  const symbol = resolveTwelveDataSymbol(asset);
  const data = await fetchTwelveDataPrices([asset]);
  const row = data.get(symbol);
  return applyMarketData(asset, row, provider);
}

async function refreshAllAssets(options = {}) {
  if (refreshInProgress) {
    return {
      success: false,
      skipped: true,
      message: 'A market price refresh is already running.'
    };
  }

  refreshInProgress = true;

  try {
    const query = options.activeOnly === false ? {} : { is_active: true };
    const assets = await TradingAsset.find(query).sort({ asset_class: 1, name: 1 });
    const coingeckoAssets = assets.filter(asset => resolveProvider(asset) === 'coingecko');
    const twelveDataAssets = assets.filter(asset => resolveProvider(asset) === 'twelvedata');
    const unsupportedAssets = assets.filter(asset => !resolveProvider(asset));

    const results = [];
    let coingeckoMap = new Map();
    let twelveDataMap = new Map();

    if (coingeckoAssets.length) {
      try {
        coingeckoMap = await fetchCoinGeckoPrices(coingeckoAssets);
      } catch (error) {
        results.push({ provider: 'coingecko', success: false, error: error.message });
      }
    }

    if (twelveDataAssets.length) {
      try {
        twelveDataMap = await fetchTwelveDataPrices(twelveDataAssets);
      } catch (error) {
        results.push({ provider: 'twelvedata', success: false, error: error.message });
      }
    }

    let updated = 0;
    let failed = 0;

    for (const asset of coingeckoAssets) {
      try {
        const row = coingeckoMap.get(resolveCoinGeckoId(asset));

        if (!row) {
          throw new Error(`No live price returned for ${asset.symbol}.`);
        }

        await applyMarketData(asset, row, 'coingecko');
        updated += 1;
      } catch (error) {
        failed += 1;
        results.push({ asset: asset.symbol, provider: 'coingecko', success: false, error: error.message });
      }
    }

    for (const asset of twelveDataAssets) {
      try {
        const row = twelveDataMap.get(resolveTwelveDataSymbol(asset));

        if (!row) {
          throw new Error(`No live price returned for ${asset.symbol}.`);
        }

        await applyMarketData(asset, row, 'twelvedata');
        updated += 1;
      } catch (error) {
        failed += 1;
        results.push({ asset: asset.symbol, provider: 'twelvedata', success: false, error: error.message });
      }
    }

    for (const asset of unsupportedAssets) {
      failed += 1;
      results.push({
        asset: asset.symbol,
        provider: null,
        success: false,
        error: 'No live market provider is configured for this asset.'
      });
    }

    return {
      success: failed === 0,
      updated,
      failed,
      total: assets.length,
      results,
      refreshed_at: new Date().toISOString()
    };
  } finally {
    refreshInProgress = false;
  }
}

function startMarketPriceRefresh() {
  const intervalMs = Math.max(
    20000,
    Number(process.env.MARKET_PRICE_REFRESH_INTERVAL_MS || 60000)
  );

  const run = () => {
    refreshAllAssets().catch(error => {
      console.error('Market price refresh failed:', error.message);
    });
  };

  setTimeout(run, 5000);
  setInterval(run, intervalMs);
}

module.exports = {
  refreshAsset,
  refreshAllAssets,
  startMarketPriceRefresh,
  resolveProvider
};
