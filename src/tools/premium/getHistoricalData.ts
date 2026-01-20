interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function getHistoricalData(symbol: string, days: number) {
  // Mock data generator since we don't have a paid CryptoCompare key in this context
  const data: OHLCV[] = [];
  const now = Math.floor(Date.now() / 1000);
  let price = 0.10; // Base mock price

  for (let i = days; i > 0; i--) {
    const volatility = (Math.random() - 0.5) * 0.01;
    price = price * (1 + volatility);
    
    data.push({
      time: now - (i * 86400),
      open: price,
      high: price * 1.02,
      low: price * 0.98,
      close: price * (1 + (Math.random() - 0.5) * 0.005),
      volume: Math.floor(Math.random() * 1000000)
    });
  }

  return {
    symbol,
    period: `${days} days`,
    dataPoints: data.length,
    data
  };
}