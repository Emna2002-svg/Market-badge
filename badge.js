const { createCanvas } = require('@napi-rs/canvas');

// Stocks to display — edit tickers here
const TICKERS = ['GOOGL', 'AMZN', 'MSFT', 'META'];

async function fetchQuotes(tickers) {
  const results = [];
  for (const ticker of tickers) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=2d`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
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

function drawBadge(quotes) {
  const W = 620;
  const H = 90;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#0F1923';
  ctx.fillRect(0, 0, W, H);

  // Top accent line
  ctx.fillStyle = '#2E75B6';
  ctx.fillRect(0, 0, W, 3);

  // Label
  ctx.fillStyle = '#8899AA';
  ctx.font = 'bold 10px monospace';
  ctx.fillText('LIVE MARKET  •  Updated at open', 16, 20);

  // Timestamp (UTC)
  const now = new Date();
  const timeStr = now.toUTCString().replace('GMT', 'UTC');
  ctx.fillStyle = '#445566';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(timeStr, W - 16, 20);
  ctx.textAlign = 'left';

  // Divider
  ctx.strokeStyle = '#1E2D3D';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(16, 28);
  ctx.lineTo(W - 16, 28);
  ctx.stroke();

  // Each stock
  const slotW = (W - 32) / quotes.length;
  quotes.forEach((q, i) => {
    const x = 16 + i * slotW;
    const centerX = x + slotW / 2;

    // Ticker
    ctx.fillStyle = '#CCDDEE';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(q.ticker, centerX, 50);

    if (q.price !== null) {
      // Price
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(`$${q.price.toFixed(2)}`, centerX, 68);

      // Change badge
      const isPos = q.change >= 0;
      const changeText = `${isPos ? '▲' : '▼'} ${Math.abs(q.change).toFixed(2)}%`;
      const badgeColor = isPos ? '#1A4A2E' : '#4A1A1A';
      const textColor = isPos ? '#4ADE80' : '#F87171';

      // Badge bg
      ctx.font = 'bold 11px monospace';
      const tw = ctx.measureText(changeText).width;
      const bx = centerX - tw / 2 - 6;
      const by = 73;
      ctx.fillStyle = badgeColor;
      ctx.beginPath();
      ctx.roundRect(bx, by, tw + 12, 16, 4);
      ctx.fill();

      // Badge text
      ctx.fillStyle = textColor;
      ctx.fillText(changeText, centerX, 85);
    } else {
      ctx.fillStyle = '#445566';
      ctx.font = '12px monospace';
      ctx.fillText('N/A', centerX, 68);
    }

    // Separator
    if (i < quotes.length - 1) {
      ctx.strokeStyle = '#1E2D3D';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + slotW, 32);
      ctx.lineTo(x + slotW, H - 8);
      ctx.stroke();
    }
  });

  return canvas.toBuffer('image/png');
}

export default async function handler(req, res) {
  // Cache-busting — never cache this image so it's always fresh on open
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Content-Type', 'image/png');

  try {
    const quotes = await fetchQuotes(TICKERS);
    const png = drawBadge(quotes);
    res.send(png);
  } catch (err) {
    // Return a simple error image
    const canvas = createCanvas(620, 90);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0F1923';
    ctx.fillRect(0, 0, 620, 90);
    ctx.fillStyle = '#FF6666';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Market data unavailable', 310, 50);
    res.send(canvas.toBuffer('image/png'));
  }
}
