const TICKERS = ['GOOGL', 'AMZN', 'MSFT', 'META'];

async function fetchQuotes(tickers) {
  const results = [];
  for (const ticker of tickers) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=2d`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) throw new Error('No meta');
      const price = meta.regularMarketPrice;
      const prev = meta.chartPreviousClose || meta.previousClose;
      const change = ((price - prev) / prev) * 100;
      results.push({ ticker, price, change });
    } catch (e) {
      results.push({ ticker, price: null, change: null });
    }
  }
  return results;
}

function buildSVG(quotes) {
  const W = 620; const H = 90;
  const slotW = W / quotes.length;
  const now = new Date().toUTCString().replace(' GMT', ' UTC');
  const slots = quotes.map((q, i) => {
    const cx = i * slotW + slotW / 2;
    const isPos = q.change >= 0;
    const changeText = q.price !== null ? `${isPos ? '▲' : '▼'} ${Math.abs(q.change).toFixed(2)}%` : 'N/A';
    const priceText = q.price !== null ? `$${q.price.toFixed(2)}` : '—';
    const badgeFill = isPos ? '#1A4A2E' : '#4A1A1A';
    const changeColor = isPos ? '#4ADE80' : '#F87171';
    const sep = i < quotes.length - 1 ? `<line x1="${(i+1)*slotW}" y1="30" x2="${(i+1)*slotW}" y2="${H-6}" stroke="#1E2D3D" stroke-width="1"/>` : '';
    return `<text x="${cx}" y="50" text-anchor="middle" font-family="monospace" font-size="13" font-weight="bold" fill="#CCDDEE">${q.ticker}</text>
      <text x="${cx}" y="67" text-anchor="middle" font-family="monospace" font-size="15" font-weight="bold" fill="#FFFFFF">${priceText}</text>
      <rect x="${cx-38}" y="72" width="76" height="16" rx="4" fill="${badgeFill}"/>
      <text x="${cx}" y="84" text-anchor="middle" font-family="monospace" font-size="11" font-weight="bold" fill="${changeColor}">${changeText}</text>${sep}`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#0F1923"/>
    <rect width="${W}" height="3" fill="#2E75B6"/>
    <text x="16" y="20" font-family="monospace" font-size="10" font-weight="bold" fill="#8899AA">LIVE MARKET  •  Updated at open</text>
    <text x="${W-16}" y="20" text-anchor="end" font-family="monospace" font-size="10" fill="#445566">${now}</text>
    <line x1="16" y1="28" x2="${W-16}" y2="28" stroke="#1E2D3D" stroke-width="1"/>
    ${slots}</svg>`;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Content-Type', 'image/svg+xml');
  try {
    const quotes = await fetchQuotes(TICKERS);
    res.send(buildSVG(quotes));
  } catch (err) {
    res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="620" height="90"><rect width="620" height="90" fill="#0F1923"/><text x="310" y="50" text-anchor="middle" font-family="monospace" font-size="14" fill="#FF6666">Market data unavailable</text></svg>`);
  }
}
