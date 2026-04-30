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
    const badgeFill = isPos ? '#E8F5EE' : '#FDF0F0';
    const changeColor = isPos ? '#1A6B3C' : '#C0392B';
    const sep = i < quotes.length - 1 ? `<line x1="${(i+1)*slotW}" y1="28" x2="${(i+1)*slotW}" y2="${H-8}" stroke="#DDE6F0" stroke-width="1"/>` : '';
    return `<text x="${cx}" y="48" text-anchor="middle" font-family="Georgia, serif" font-size="12" font-weight="bold" fill="#1F3A5F">${q.ticker}</text>
      <text x="${cx}" y="65" text-anchor="middle" font-family="Georgia, serif" font-size="15" font-weight="bold" fill="#0D2B4E">${priceText}</text>
      <rect x="${cx-36}" y="70" width="72" height="16" rx="3" fill="${badgeFill}"/>
      <text x="${cx}" y="82" text-anchor="middle" font-family="Georgia, serif" font-size="11" font-weight="bold" fill="${changeColor}">${changeText}</text>${sep}`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#FFFFFF"/>
    <rect width="${W}" height="3" fill="#1F3A5F"/>
    <rect y="${H-3}" width="${W}" height="3" fill="#1F3A5F"/>
    <text x="16" y="20" font-family="Georgia, serif" font-size="10" font-weight="bold" fill="#1F3A5F">LIVE MARKET</text>
    <text x="${W-16}" y="20" text-anchor="end" font-family="Georgia, serif" font-size="9" fill="#7A92AA">${now}</text>
    <line x1="0" y1="26" x2="${W}" y2="26" stroke="#DDE6F0" stroke-width="1"/>
    ${slots}</svg>`;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Content-Type', 'image/svg+xml');
  try {
    const quotes = await fetchQuotes(TICKERS);
    res.send(buildSVG(quotes));
  } catch (err) {
    res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="620" height="90"><rect width="620" height="90" fill="#FFFFFF"/><text x="310" y="50" text-anchor="middle" font-family="Georgia, serif" font-size="14" fill="#C0392B">Market data unavailable</text></svg>`);
  }
}
