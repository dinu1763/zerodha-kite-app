/**
 * Core Trading Strategy Engine
 * Implements the intraday algorithmic trading strategy
 */

export class TradingStrategy {
  constructor(config = {}) {
    this.config = {
      // Default configuration
      initialCapital: config.initialCapital || 100000, // ₹1,00,000
      positionSizePercent: config.positionSizePercent || 2, // 2% of capital
      
      // Initial trade parameters
      initialProfitTarget: config.initialProfitTarget || 0.75, // 0.75%
      initialStopLoss: config.initialStopLoss || 0.35, // 0.35%
      
      // Follow-up trade parameters (after profit target hit)
      followUpProfitTarget: config.followUpProfitTarget || 0.35, // 0.35%
      followUpStopLoss: config.followUpStopLoss || 0.15, // 0.15%
      followUpSizeReduction: config.followUpSizeReduction || 0.5, // 50% of previous size
      
      // Risk management
      maxTradesPerDay: config.maxTradesPerDay || 5,
      maxDailyLossPercent: config.maxDailyLossPercent || 2, // 2% of capital
      
      // Trading hours (IST)
      tradingStartTime: config.tradingStartTime || '10:00',
      tradingEndTime: config.tradingEndTime || '15:15',
      
      // Instrument
      instrument: config.instrument || 'NIFTY',
      exchange: config.exchange || 'NSE',
      
      ...config
    };
    
    this.state = {
      currentPosition: null,
      dailyTrades: [],
      dailyPnL: 0,
      isMarketHours: false,
      lastTradeTime: null,
      waitingForCandle: false,
      candleEndTime: null
    };
  }

  /**
   * Main strategy execution method
   * Called periodically by the scheduler
   */
  async execute(marketData, orderManager, riskManager) {
    try {
      // Check if we're in trading hours
      if (!this.isMarketHours()) {
        return { action: 'NO_ACTION', reason: 'Outside trading hours' };
      }

      // Check daily risk limits
      const riskCheck = await riskManager.checkDailyLimits(this.state.dailyPnL, this.state.dailyTrades.length);
      if (!riskCheck.canTrade) {
        return { action: 'NO_ACTION', reason: riskCheck.reason };
      }

      // If waiting for candle completion, check if we can proceed
      if (this.state.waitingForCandle) {
        if (!this.isCandleComplete()) {
          return { action: 'WAITING', reason: 'Waiting for candle completion' };
        }
        this.state.waitingForCandle = false;
      }

      // Check current position status
      if (this.state.currentPosition) {
        return await this.manageExistingPosition(marketData, orderManager);
      } else {
        return await this.lookForEntry(marketData, orderManager);
      }
    } catch (error) {
      console.error('Strategy execution error:', error);
      return { action: 'ERROR', error: error.message };
    }
  }

  /**
   * Look for entry opportunities
   */
  async lookForEntry(marketData, orderManager) {
    const currentTime = new Date();
    const startTime = this.parseTime(this.config.tradingStartTime);
    
    // Only enter at 10:00 AM or after stop loss re-entry
    if (currentTime.getHours() === startTime.getHours() && 
        currentTime.getMinutes() === startTime.getMinutes()) {
      
      const signal = this.generateEntrySignal(marketData);
      if (signal.shouldEnter) {
        return await this.enterPosition(signal, orderManager);
      }
    }
    
    return { action: 'NO_ACTION', reason: 'No entry signal' };
  }

  /**
   * Generate entry signal based on market data
   */
  generateEntrySignal(marketData) {
    // Simple momentum-based entry
    // You can enhance this with more sophisticated indicators
    const currentPrice = marketData.ltp;
    const openPrice = marketData.open;
    
    // Enter long if price is above opening price (simple momentum)
    const shouldEnter = currentPrice > openPrice;
    
    return {
      shouldEnter,
      direction: 'BUY',
      entryPrice: currentPrice,
      reason: shouldEnter ? 'Price above opening' : 'Price below opening'
    };
  }

  /**
   * Enter a new position
   */
  async enterPosition(signal, orderManager) {
    const positionSize = this.calculatePositionSize();
    const entryPrice = signal.entryPrice;
    
    // Calculate targets and stop loss
    const profitTarget = this.state.currentPosition ? 
      this.config.followUpProfitTarget : this.config.initialProfitTarget;
    const stopLossPercent = this.state.currentPosition ? 
      this.config.followUpStopLoss : this.config.initialStopLoss;
    
    const targetPrice = entryPrice * (1 + profitTarget / 100);
    const stopLossPrice = entryPrice * (1 - stopLossPercent / 100);
    
    const order = {
      symbol: this.config.instrument,
      exchange: this.config.exchange,
      transaction_type: signal.direction,
      quantity: positionSize,
      order_type: 'MARKET',
      product: 'MIS', // Intraday
      validity: 'DAY'
    };
    
    try {
      const orderResult = await orderManager.placeOrder(order);
      
      if (orderResult.success) {
        this.state.currentPosition = {
          orderId: orderResult.order_id,
          entryPrice: entryPrice,
          quantity: positionSize,
          direction: signal.direction,
          targetPrice: targetPrice,
          stopLossPrice: stopLossPrice,
          entryTime: new Date(),
          isFollowUp: !!this.state.currentPosition
        };
        
        // Place target and stop loss orders
        await this.placeExitOrders(orderManager);
        
        return { 
          action: 'POSITION_ENTERED', 
          position: this.state.currentPosition,
          reason: signal.reason 
        };
      }
    } catch (error) {
      console.error('Error entering position:', error);
      return { action: 'ERROR', error: error.message };
    }
  }

  /**
   * Manage existing position
   */
  async manageExistingPosition(marketData, orderManager) {
    const position = this.state.currentPosition;
    const currentPrice = marketData.ltp;
    
    // Check if target or stop loss is hit
    if (position.direction === 'BUY') {
      if (currentPrice >= position.targetPrice) {
        return await this.handleTargetHit(orderManager);
      } else if (currentPrice <= position.stopLossPrice) {
        return await this.handleStopLossHit(orderManager);
      }
    }
    
    return { action: 'MONITORING', position: position };
  }

  /**
   * Handle profit target hit
   */
  async handleTargetHit(orderManager) {
    const position = this.state.currentPosition;
    
    // Close current position
    await this.closePosition(orderManager);
    
    // Record the trade
    this.recordTrade(position, 'TARGET_HIT');
    
    // Wait for candle completion before next trade
    this.state.waitingForCandle = true;
    this.state.candleEndTime = this.getNextCandleEndTime();
    
    // Reduce position size for next trade
    this.state.nextPositionSizeMultiplier = this.config.followUpSizeReduction;
    
    return { 
      action: 'TARGET_HIT', 
      trade: position,
      waitingUntil: this.state.candleEndTime 
    };
  }

  /**
   * Handle stop loss hit
   */
  async handleStopLossHit(orderManager) {
    const position = this.state.currentPosition;
    
    // Close current position
    await this.closePosition(orderManager);
    
    // Record the trade
    this.recordTrade(position, 'STOP_LOSS_HIT');
    
    // Wait for candle completion before re-entry
    this.state.waitingForCandle = true;
    this.state.candleEndTime = this.getNextCandleEndTime();
    
    // Reset position size multiplier for re-entry
    this.state.nextPositionSizeMultiplier = 1;
    
    return { 
      action: 'STOP_LOSS_HIT', 
      trade: position,
      waitingUntil: this.state.candleEndTime 
    };
  }

  /**
   * Calculate position size based on capital and risk management
   */
  calculatePositionSize() {
    const baseSize = Math.floor(
      (this.config.initialCapital * this.config.positionSizePercent / 100) / 100
    ); // Assuming ₹100 per unit
    
    const multiplier = this.state.nextPositionSizeMultiplier || 1;
    return Math.floor(baseSize * multiplier);
  }

  /**
   * Utility methods
   */
  isMarketHours() {
    const now = new Date();
    const startTime = this.parseTime(this.config.tradingStartTime);
    const endTime = this.parseTime(this.config.tradingEndTime);
    
    return now >= startTime && now <= endTime;
  }

  parseTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  isCandleComplete() {
    return new Date() >= this.state.candleEndTime;
  }

  getNextCandleEndTime() {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    return nextHour;
  }

  recordTrade(position, exitReason) {
    const trade = {
      ...position,
      exitTime: new Date(),
      exitReason: exitReason,
      pnl: this.calculatePnL(position)
    };
    
    this.state.dailyTrades.push(trade);
    this.state.dailyPnL += trade.pnl;
    this.state.currentPosition = null;
    
    return trade;
  }

  calculatePnL(position) {
    // Simplified P&L calculation
    // In real implementation, use actual exit price
    const targetHit = position.exitReason === 'TARGET_HIT';
    const profitPercent = targetHit ? 
      (position.isFollowUp ? this.config.followUpProfitTarget : this.config.initialProfitTarget) :
      -(position.isFollowUp ? this.config.followUpStopLoss : this.config.initialStopLoss);
    
    return (position.entryPrice * position.quantity * profitPercent / 100);
  }

  async closePosition(orderManager) {
    // Implementation for closing position
    // This would place a market order to exit
  }

  async placeExitOrders(orderManager) {
    // Implementation for placing target and stop loss orders
    // This would place bracket orders or separate limit/stop orders
  }
}
