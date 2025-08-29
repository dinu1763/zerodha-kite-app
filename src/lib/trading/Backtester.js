/**
 * Backtesting Framework
 * Test trading strategies on historical data
 */

export class Backtester {
  constructor(config = {}) {
    this.config = {
      initialCapital: config.initialCapital || 100000,
      commission: config.commission || 0.0003, // 0.03% per trade
      slippage: config.slippage || 0.0001, // 0.01% slippage
      ...config
    };
    
    this.results = {
      trades: [],
      dailyPnL: [],
      metrics: {},
      equity: []
    };
    
    this.currentCapital = this.config.initialCapital;
    this.currentPosition = null;
    this.tradeId = 1;
  }

  /**
   * Run backtest on historical data
   */
  async runBacktest(historicalData, strategy) {
    console.log('Starting backtest...');
    
    // Reset state
    this.resetBacktest();
    
    // Process each data point
    for (let i = 0; i < historicalData.length; i++) {
      const currentData = historicalData[i];
      const previousData = i > 0 ? historicalData[i - 1] : null;
      
      // Update equity curve
      this.updateEquityCurve(currentData.timestamp);
      
      // Execute strategy logic
      await this.executeStrategyStep(currentData, previousData, strategy);
    }
    
    // Calculate final metrics
    this.calculateMetrics();
    
    console.log('Backtest completed');
    return this.results;
  }

  /**
   * Reset backtest state
   */
  resetBacktest() {
    this.results = {
      trades: [],
      dailyPnL: [],
      metrics: {},
      equity: []
    };
    
    this.currentCapital = this.config.initialCapital;
    this.currentPosition = null;
    this.tradeId = 1;
  }

  /**
   * Execute one step of strategy logic
   */
  async executeStrategyStep(currentData, previousData, strategy) {
    try {
      // Create mock market data service
      const mockMarketData = {
        ltp: currentData.close,
        open: currentData.open,
        high: currentData.high,
        low: currentData.low,
        close: currentData.close,
        volume: currentData.volume
      };
      
      // Create mock order manager
      const mockOrderManager = {
        placeOrder: (order) => this.simulateOrder(order, currentData),
        getPositions: () => ({ success: true, positions: { net: [] } })
      };
      
      // Create mock risk manager
      const mockRiskManager = {
        checkDailyLimits: () => ({ canTrade: true }),
        updateDailyStats: (trade) => {}
      };
      
      // Execute strategy
      const result = await strategy.execute(mockMarketData, mockOrderManager, mockRiskManager);
      
      // Handle strategy result
      this.handleStrategyResult(result, currentData);
      
    } catch (error) {
      console.error('Error in strategy execution:', error);
    }
  }

  /**
   * Simulate order execution
   */
  simulateOrder(order, marketData) {
    const executionPrice = this.calculateExecutionPrice(order, marketData);
    const commission = this.calculateCommission(order.quantity, executionPrice);
    
    if (order.transaction_type === 'BUY') {
      // Enter position
      this.currentPosition = {
        id: this.tradeId++,
        symbol: order.symbol,
        direction: 'BUY',
        quantity: order.quantity,
        entryPrice: executionPrice,
        entryTime: marketData.timestamp,
        commission: commission
      };
      
      this.currentCapital -= (order.quantity * executionPrice + commission);
      
    } else if (order.transaction_type === 'SELL' && this.currentPosition) {
      // Exit position
      const exitPrice = executionPrice;
      const exitCommission = this.calculateCommission(order.quantity, exitPrice);
      
      const grossPnL = (exitPrice - this.currentPosition.entryPrice) * order.quantity;
      const netPnL = grossPnL - this.currentPosition.commission - exitCommission;
      
      const trade = {
        ...this.currentPosition,
        exitPrice: exitPrice,
        exitTime: marketData.timestamp,
        grossPnL: grossPnL,
        netPnL: netPnL,
        commission: this.currentPosition.commission + exitCommission,
        exitReason: 'STRATEGY_EXIT'
      };
      
      this.results.trades.push(trade);
      this.currentCapital += (order.quantity * exitPrice - exitCommission);
      this.currentPosition = null;
    }
    
    return {
      success: true,
      order_id: `backtest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  /**
   * Calculate execution price with slippage
   */
  calculateExecutionPrice(order, marketData) {
    let basePrice;
    
    switch (order.order_type) {
      case 'MARKET':
        basePrice = marketData.close;
        break;
      case 'LIMIT':
        basePrice = order.price;
        break;
      default:
        basePrice = marketData.close;
    }
    
    // Apply slippage
    const slippageAmount = basePrice * this.config.slippage;
    const slippage = order.transaction_type === 'BUY' ? slippageAmount : -slippageAmount;
    
    return basePrice + slippage;
  }

  /**
   * Calculate commission
   */
  calculateCommission(quantity, price) {
    return quantity * price * this.config.commission;
  }

  /**
   * Handle strategy execution result
   */
  handleStrategyResult(result, marketData) {
    // Log significant events
    if (result.action === 'POSITION_ENTERED') {
      console.log(`Position entered at ${marketData.timestamp}: ${result.position?.symbol}`);
    } else if (result.action === 'TARGET_HIT' || result.action === 'STOP_LOSS_HIT') {
      console.log(`Position closed at ${marketData.timestamp}: ${result.action}`);
    }
  }

  /**
   * Update equity curve
   */
  updateEquityCurve(timestamp) {
    let totalValue = this.currentCapital;
    
    // Add unrealized P&L if in position
    if (this.currentPosition) {
      // This would need current market price - simplified for backtest
      totalValue += 0; // Unrealized P&L calculation would go here
    }
    
    this.results.equity.push({
      timestamp: timestamp,
      value: totalValue
    });
  }

  /**
   * Calculate performance metrics
   */
  calculateMetrics() {
    const trades = this.results.trades;
    
    if (trades.length === 0) {
      this.results.metrics = {
        totalTrades: 0,
        winRate: 0,
        totalReturn: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        profitFactor: 0
      };
      return;
    }
    
    // Basic metrics
    const winningTrades = trades.filter(t => t.netPnL > 0);
    const losingTrades = trades.filter(t => t.netPnL < 0);
    
    const totalPnL = trades.reduce((sum, t) => sum + t.netPnL, 0);
    const totalWins = winningTrades.reduce((sum, t) => sum + t.netPnL, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.netPnL, 0));
    
    // Calculate drawdown
    const { maxDrawdown, maxDrawdownPercent } = this.calculateDrawdown();
    
    // Calculate Sharpe ratio (simplified)
    const returns = trades.map(t => t.netPnL / this.config.initialCapital);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const returnStdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = returnStdDev > 0 ? (avgReturn / returnStdDev) * Math.sqrt(252) : 0;
    
    this.results.metrics = {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: (winningTrades.length / trades.length) * 100,
      
      totalReturn: (totalPnL / this.config.initialCapital) * 100,
      totalPnL: totalPnL,
      
      avgWin: winningTrades.length > 0 ? totalWins / winningTrades.length : 0,
      avgLoss: losingTrades.length > 0 ? totalLosses / losingTrades.length : 0,
      
      profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0,
      
      maxDrawdown: maxDrawdown,
      maxDrawdownPercent: maxDrawdownPercent,
      
      sharpeRatio: sharpeRatio,
      
      finalCapital: this.currentCapital,
      
      // Additional metrics
      largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.netPnL)) : 0,
      largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.netPnL)) : 0,
      
      avgTradeDuration: this.calculateAvgTradeDuration(),
      
      // Risk metrics
      calmarRatio: maxDrawdownPercent > 0 ? (totalPnL / this.config.initialCapital * 100) / maxDrawdownPercent : 0
    };
  }

  /**
   * Calculate maximum drawdown
   */
  calculateDrawdown() {
    let peak = this.config.initialCapital;
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    
    this.results.equity.forEach(point => {
      if (point.value > peak) {
        peak = point.value;
      }
      
      const drawdown = peak - point.value;
      const drawdownPercent = (drawdown / peak) * 100;
      
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownPercent = drawdownPercent;
      }
    });
    
    return { maxDrawdown, maxDrawdownPercent };
  }

  /**
   * Calculate average trade duration
   */
  calculateAvgTradeDuration() {
    if (this.results.trades.length === 0) return 0;
    
    const durations = this.results.trades.map(trade => {
      const entryTime = new Date(trade.entryTime);
      const exitTime = new Date(trade.exitTime);
      return (exitTime - entryTime) / (1000 * 60); // Duration in minutes
    });
    
    return durations.reduce((sum, d) => sum + d, 0) / durations.length;
  }

  /**
   * Generate backtest report
   */
  generateReport() {
    return {
      summary: this.results.metrics,
      trades: this.results.trades,
      equity: this.results.equity,
      config: this.config,
      
      // Additional analysis
      monthlyReturns: this.calculateMonthlyReturns(),
      tradeAnalysis: this.analyzeTradePatterns()
    };
  }

  /**
   * Calculate monthly returns
   */
  calculateMonthlyReturns() {
    // Group trades by month and calculate returns
    const monthlyData = {};
    
    this.results.trades.forEach(trade => {
      const month = new Date(trade.exitTime).toISOString().substr(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { pnl: 0, trades: 0 };
      }
      monthlyData[month].pnl += trade.netPnL;
      monthlyData[month].trades += 1;
    });
    
    return monthlyData;
  }

  /**
   * Analyze trade patterns
   */
  analyzeTradePatterns() {
    const trades = this.results.trades;
    
    return {
      consecutiveWins: this.findMaxConsecutive(trades, t => t.netPnL > 0),
      consecutiveLosses: this.findMaxConsecutive(trades, t => t.netPnL < 0),
      bestTradingHour: this.findBestTradingHour(trades),
      worstTradingHour: this.findWorstTradingHour(trades)
    };
  }

  /**
   * Find maximum consecutive wins/losses
   */
  findMaxConsecutive(trades, condition) {
    let maxConsecutive = 0;
    let currentConsecutive = 0;
    
    trades.forEach(trade => {
      if (condition(trade)) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    });
    
    return maxConsecutive;
  }

  /**
   * Find best trading hour
   */
  findBestTradingHour(trades) {
    const hourlyPnL = {};
    
    trades.forEach(trade => {
      const hour = new Date(trade.entryTime).getHours();
      if (!hourlyPnL[hour]) hourlyPnL[hour] = 0;
      hourlyPnL[hour] += trade.netPnL;
    });
    
    return Object.keys(hourlyPnL).reduce((best, hour) => 
      hourlyPnL[hour] > (hourlyPnL[best] || -Infinity) ? hour : best, null
    );
  }

  /**
   * Find worst trading hour
   */
  findWorstTradingHour(trades) {
    const hourlyPnL = {};
    
    trades.forEach(trade => {
      const hour = new Date(trade.entryTime).getHours();
      if (!hourlyPnL[hour]) hourlyPnL[hour] = 0;
      hourlyPnL[hour] += trade.netPnL;
    });
    
    return Object.keys(hourlyPnL).reduce((worst, hour) => 
      hourlyPnL[hour] < (hourlyPnL[worst] || Infinity) ? hour : worst, null
    );
  }
}
