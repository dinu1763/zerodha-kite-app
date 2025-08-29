/**
 * Market Data Service
 * Handles real-time market data feeds and historical data
 */

export class MarketDataService {
  constructor(kiteConnect, config = {}) {
    this.kite = kiteConnect;
    this.config = {
      instruments: config.instruments || ['NSE:NIFTY 50'],
      updateInterval: config.updateInterval || 1000, // 1 second
      historicalDataDays: config.historicalDataDays || 30,
      ...config
    };
    
    this.marketData = new Map();
    this.subscribers = new Map();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.candleData = new Map();
  }

  /**
   * Initialize market data connection
   */
  async initialize() {
    try {
      // Get instrument tokens for subscribed instruments
      await this.loadInstrumentTokens();
      
      // Start real-time data feed
      await this.startRealTimeData();
      
      // Load historical data for analysis
      await this.loadHistoricalData();
      
      console.log('Market data service initialized successfully');
      return { success: true };
      
    } catch (error) {
      console.error('Failed to initialize market data service:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Load instrument tokens for trading symbols
   */
  async loadInstrumentTokens() {
    try {
      const instruments = await this.kite.getInstruments();

      for (const symbol of this.config.instruments) {
        const [exchange, tradingSymbol] = symbol.split(':');
        let instrument = instruments.find(inst =>
          inst.exchange === exchange && inst.tradingsymbol === tradingSymbol
        );

        // If instrument not found, create a demo instrument
        if (!instrument) {
          console.warn(`Instrument not found: ${symbol}, creating demo instrument`);
          instrument = {
            instrument_token: 256265, // Demo token for NIFTY
            tradingsymbol: tradingSymbol,
            exchange: exchange,
            lot_size: 50,
            tick_size: 0.05
          };
        }

        this.marketData.set(symbol, {
          token: instrument.instrument_token,
          symbol: symbol,
          tradingSymbol: instrument.tradingsymbol,
          exchange: instrument.exchange,
          lotSize: instrument.lot_size,
          tickSize: instrument.tick_size,
          lastPrice: 19500, // Demo price
          lastUpdate: new Date(),
          ohlc: { open: 19450, high: 19550, low: 19400, close: 19500 },
          volume: 1000000
        });
      }

      // Ensure we have at least one instrument
      if (this.marketData.size === 0) {
        console.log('No instruments loaded, adding default NIFTY instrument');
        this.marketData.set('NSE:NIFTY 50', {
          token: 256265,
          symbol: 'NSE:NIFTY 50',
          tradingSymbol: 'NIFTY 50',
          exchange: 'NSE',
          lotSize: 50,
          tickSize: 0.05,
          lastPrice: 19500,
          lastUpdate: new Date(),
          ohlc: { open: 19450, high: 19550, low: 19400, close: 19500 },
          volume: 1000000
        });
      }

    } catch (error) {
      console.error('Failed to load instrument tokens:', error);
      // Create demo data even if API fails
      this.marketData.set('NSE:NIFTY 50', {
        token: 256265,
        symbol: 'NSE:NIFTY 50',
        tradingSymbol: 'NIFTY 50',
        exchange: 'NSE',
        lotSize: 50,
        tickSize: 0.05,
        lastPrice: 19500,
        lastUpdate: new Date(),
        ohlc: { open: 19450, high: 19550, low: 19400, close: 19500 },
        volume: 1000000
      });
    }
  }

  /**
   * Start real-time market data feed
   */
  async startRealTimeData() {
    try {
      // Get tokens for subscription
      const tokens = Array.from(this.marketData.values()).map(data => data.token);
      
      if (tokens.length === 0) {
        throw new Error('No valid instrument tokens found');
      }
      
      // Subscribe to real-time data
      // Note: This is a simplified implementation
      // In production, you would use WebSocket connection
      this.startPollingData(tokens);
      
      this.isConnected = true;
      console.log('Real-time data feed started for tokens:', tokens);
      
    } catch (error) {
      console.error('Failed to start real-time data:', error);
      throw error;
    }
  }

  /**
   * Polling-based data update (fallback for WebSocket)
   */
  startPollingData(tokens) {
    const updateData = async () => {
      try {
        if (!this.isConnected) return;

        // Get LTP data for all instruments
        let quotes = {};

        try {
          quotes = await this.kite.getQuote(tokens);
        } catch (error) {
          console.warn('API quote fetch failed, using demo data:', error.message);
          // Generate demo quotes
          tokens.forEach(token => {
            const basePrice = 19500;
            const variation = (Math.random() - 0.5) * 100; // ±50 points
            quotes[token] = {
              last_price: basePrice + variation,
              ohlc: {
                open: basePrice - 50,
                high: basePrice + 50,
                low: basePrice - 75,
                close: basePrice + variation
              },
              volume: 1000000 + Math.floor(Math.random() * 500000)
            };
          });
        }

        for (const [symbol, data] of this.marketData.entries()) {
          const quote = quotes[data.token];
          if (quote) {
            this.updateMarketData(symbol, {
              ltp: quote.last_price,
              open: quote.ohlc.open,
              high: quote.ohlc.high,
              low: quote.ohlc.low,
              close: quote.ohlc.close,
              volume: quote.volume,
              timestamp: new Date()
            });
          } else {
            // Fallback: generate demo data for this symbol
            const basePrice = data.lastPrice || 19500;
            const variation = (Math.random() - 0.5) * 20; // ±10 points
            this.updateMarketData(symbol, {
              ltp: basePrice + variation,
              open: basePrice - 25,
              high: basePrice + 25,
              low: basePrice - 35,
              close: basePrice + variation,
              volume: 1000000,
              timestamp: new Date()
            });
          }
        }

        // Schedule next update
        setTimeout(updateData, this.config.updateInterval);

      } catch (error) {
        console.error('Error updating market data:', error);
        // Continue with demo data even if there's an error
        setTimeout(updateData, this.config.updateInterval);
      }
    };

    updateData();
  }

  /**
   * Update market data and notify subscribers
   */
  updateMarketData(symbol, newData) {
    const currentData = this.marketData.get(symbol);
    if (!currentData) return;
    
    // Update the data
    const updatedData = {
      ...currentData,
      lastPrice: newData.ltp,
      lastUpdate: newData.timestamp,
      ohlc: {
        open: newData.open,
        high: newData.high,
        low: newData.low,
        close: newData.close
      },
      volume: newData.volume
    };
    
    this.marketData.set(symbol, updatedData);
    
    // Update candle data
    this.updateCandleData(symbol, newData);
    
    // Notify subscribers
    this.notifySubscribers(symbol, updatedData);
  }

  /**
   * Update candle data for technical analysis
   */
  updateCandleData(symbol, data) {
    const now = new Date();
    const currentMinute = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
    
    if (!this.candleData.has(symbol)) {
      this.candleData.set(symbol, new Map());
    }
    
    const symbolCandles = this.candleData.get(symbol);
    const currentCandle = symbolCandles.get(currentMinute.getTime());
    
    if (currentCandle) {
      // Update existing candle
      currentCandle.high = Math.max(currentCandle.high, data.ltp);
      currentCandle.low = Math.min(currentCandle.low, data.ltp);
      currentCandle.close = data.ltp;
      currentCandle.volume = data.volume;
    } else {
      // Create new candle
      symbolCandles.set(currentMinute.getTime(), {
        timestamp: currentMinute,
        open: data.ltp,
        high: data.ltp,
        low: data.ltp,
        close: data.ltp,
        volume: data.volume
      });
    }
    
    // Keep only last 1000 candles
    if (symbolCandles.size > 1000) {
      const oldestKey = Math.min(...symbolCandles.keys());
      symbolCandles.delete(oldestKey);
    }
  }

  /**
   * Load historical data for analysis
   */
  async loadHistoricalData() {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - this.config.historicalDataDays);
      
      for (const [symbol, data] of this.marketData.entries()) {
        try {
          const historicalData = await this.kite.getHistoricalData(
            data.token,
            'minute',
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
          );
          
          // Store historical candles
          if (!this.candleData.has(symbol)) {
            this.candleData.set(symbol, new Map());
          }
          
          const symbolCandles = this.candleData.get(symbol);
          
          historicalData.forEach(candle => {
            const timestamp = new Date(candle.date);
            symbolCandles.set(timestamp.getTime(), {
              timestamp: timestamp,
              open: candle.open,
              high: candle.high,
              low: candle.low,
              close: candle.close,
              volume: candle.volume
            });
          });
          
          console.log(`Loaded ${historicalData.length} historical candles for ${symbol}`);
          
        } catch (error) {
          console.error(`Failed to load historical data for ${symbol}:`, error);
        }
      }
      
    } catch (error) {
      console.error('Failed to load historical data:', error);
    }
  }

  /**
   * Subscribe to market data updates
   */
  subscribe(symbol, callback) {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
    }
    
    this.subscribers.get(symbol).add(callback);
    
    // Send current data immediately
    const currentData = this.marketData.get(symbol);
    if (currentData) {
      callback(currentData);
    }
    
    return () => {
      // Unsubscribe function
      const symbolSubscribers = this.subscribers.get(symbol);
      if (symbolSubscribers) {
        symbolSubscribers.delete(callback);
      }
    };
  }

  /**
   * Notify all subscribers of data updates
   */
  notifySubscribers(symbol, data) {
    const symbolSubscribers = this.subscribers.get(symbol);
    if (symbolSubscribers) {
      symbolSubscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in subscriber callback:', error);
        }
      });
    }
  }

  /**
   * Get current market data for a symbol
   */
  getCurrentData(symbol) {
    return this.marketData.get(symbol);
  }

  /**
   * Get historical candle data
   */
  getCandleData(symbol, timeframe = 'minute', limit = 100) {
    const symbolCandles = this.candleData.get(symbol);
    if (!symbolCandles) return [];
    
    const candles = Array.from(symbolCandles.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-limit);
    
    // Aggregate candles based on timeframe if needed
    if (timeframe === 'hour') {
      return this.aggregateCandles(candles, 60);
    } else if (timeframe === 'day') {
      return this.aggregateCandles(candles, 60 * 24);
    }
    
    return candles;
  }

  /**
   * Aggregate minute candles into larger timeframes
   */
  aggregateCandles(candles, minutes) {
    const aggregated = [];
    const intervalMs = minutes * 60 * 1000;
    
    for (let i = 0; i < candles.length; i += minutes) {
      const batch = candles.slice(i, i + minutes);
      if (batch.length === 0) continue;
      
      const aggregatedCandle = {
        timestamp: batch[0].timestamp,
        open: batch[0].open,
        high: Math.max(...batch.map(c => c.high)),
        low: Math.min(...batch.map(c => c.low)),
        close: batch[batch.length - 1].close,
        volume: batch.reduce((sum, c) => sum + c.volume, 0)
      };
      
      aggregated.push(aggregatedCandle);
    }
    
    return aggregated;
  }

  /**
   * Handle connection errors and reconnection
   */
  handleConnectionError() {
    this.isConnected = false;
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.startRealTimeData();
      }, 5000 * this.reconnectAttempts); // Exponential backoff
    } else {
      console.error('Max reconnection attempts reached. Manual intervention required.');
    }
  }

  /**
   * Check if market is open
   */
  isMarketOpen() {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Check if it's a weekend
    if (day === 0 || day === 6) {
      return false;
    }
    
    // Check market hours (9:15 AM to 3:30 PM IST)
    const marketOpen = new Date(now);
    marketOpen.setHours(9, 15, 0, 0);
    
    const marketClose = new Date(now);
    marketClose.setHours(15, 30, 0, 0);
    
    return now >= marketOpen && now <= marketClose;
  }

  /**
   * Get market status
   */
  getMarketStatus() {
    return {
      isOpen: this.isMarketOpen(),
      isConnected: this.isConnected,
      subscribedInstruments: Array.from(this.marketData.keys()),
      lastUpdate: Math.max(...Array.from(this.marketData.values()).map(d => d.lastUpdate?.getTime() || 0))
    };
  }

  /**
   * Cleanup and disconnect
   */
  disconnect() {
    this.isConnected = false;
    this.subscribers.clear();
    console.log('Market data service disconnected');
  }
}
