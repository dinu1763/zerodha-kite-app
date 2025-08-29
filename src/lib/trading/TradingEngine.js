/**
 * Main Trading Engine Controller
 * Orchestrates all trading components and manages the overall trading system
 */

import { TradingStrategy } from './TradingStrategy.js';
import { RiskManager } from './RiskManager.js';
import { OrderManager } from './OrderManager.js';
import { MarketDataService } from './MarketDataService.js';

export class TradingEngine {
  constructor(kiteConnect, config = {}) {
    this.kite = kiteConnect;
    this.config = {
      // Trading configuration
      strategy: config.strategy || 'intraday_momentum',
      instruments: config.instruments || ['NSE:NIFTY 50'],
      initialCapital: config.initialCapital || 100000,
      
      // Risk management
      maxDailyLoss: config.maxDailyLoss || 2, // 2%
      maxTradesPerDay: config.maxTradesPerDay || 5,
      
      // Execution settings
      executionInterval: config.executionInterval || 30000, // 30 seconds
      enableAutoTrading: config.enableAutoTrading || false,
      
      ...config
    };
    
    // Initialize components
    this.strategy = new TradingStrategy(this.config);
    this.riskManager = new RiskManager(this.config);
    this.orderManager = new OrderManager(this.kite, this.config);
    this.marketData = new MarketDataService(this.kite, this.config);
    
    // Engine state
    this.isRunning = false;
    this.isPaused = false;
    this.executionTimer = null;
    this.dailyStats = {
      startTime: null,
      trades: [],
      totalPnL: 0,
      maxDrawdown: 0
    };
    
    // Event handlers
    this.eventHandlers = new Map();
  }

  /**
   * Initialize the trading engine
   */
  async initialize() {
    try {
      console.log('Initializing trading engine...');
      
      // Initialize market data service
      const marketDataResult = await this.marketData.initialize();
      if (!marketDataResult.success) {
        throw new Error(`Market data initialization failed: ${marketDataResult.error}`);
      }
      
      // Reset daily statistics
      this.resetDailyStats();
      
      // Subscribe to market data updates
      this.subscribeToMarketData();
      
      console.log('Trading engine initialized successfully');
      this.emit('initialized', { timestamp: new Date() });
      
      return { success: true };
      
    } catch (error) {
      console.error('Trading engine initialization failed:', error);
      this.emit('error', { error: error.message, timestamp: new Date() });
      return { success: false, error: error.message };
    }
  }

  /**
   * Start the trading engine
   */
  async start() {
    if (this.isRunning) {
      return { success: false, error: 'Trading engine is already running' };
    }
    
    try {
      // Check if market is open
      if (!this.marketData.isMarketOpen()) {
        return { success: false, error: 'Market is closed' };
      }
      
      // Perform pre-trading checks
      const preTradeCheck = await this.performPreTradeChecks();
      if (!preTradeCheck.success) {
        return preTradeCheck;
      }
      
      this.isRunning = true;
      this.isPaused = false;
      this.dailyStats.startTime = new Date();
      
      // Start execution loop
      this.startExecutionLoop();
      
      console.log('Trading engine started');
      this.emit('started', { timestamp: new Date() });
      
      return { success: true };
      
    } catch (error) {
      console.error('Failed to start trading engine:', error);
      this.emit('error', { error: error.message, timestamp: new Date() });
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop the trading engine
   */
  async stop() {
    if (!this.isRunning) {
      return { success: false, error: 'Trading engine is not running' };
    }
    
    try {
      this.isRunning = false;
      
      // Clear execution timer
      if (this.executionTimer) {
        clearTimeout(this.executionTimer);
        this.executionTimer = null;
      }
      
      // Close any open positions if configured to do so
      if (this.config.closePositionsOnStop) {
        await this.closeAllPositions();
      }
      
      // Generate end-of-day report
      const dailyReport = this.generateDailyReport();
      
      console.log('Trading engine stopped');
      this.emit('stopped', { 
        timestamp: new Date(),
        dailyReport: dailyReport
      });
      
      return { success: true, dailyReport: dailyReport };
      
    } catch (error) {
      console.error('Error stopping trading engine:', error);
      this.emit('error', { error: error.message, timestamp: new Date() });
      return { success: false, error: error.message };
    }
  }

  /**
   * Pause trading (stop new trades but keep monitoring)
   */
  pause() {
    if (!this.isRunning) {
      return { success: false, error: 'Trading engine is not running' };
    }
    
    this.isPaused = true;
    console.log('Trading engine paused');
    this.emit('paused', { timestamp: new Date() });
    
    return { success: true };
  }

  /**
   * Resume trading
   */
  resume() {
    if (!this.isRunning) {
      return { success: false, error: 'Trading engine is not running' };
    }
    
    this.isPaused = false;
    console.log('Trading engine resumed');
    this.emit('resumed', { timestamp: new Date() });
    
    return { success: true };
  }

  /**
   * Main execution loop
   */
  startExecutionLoop() {
    const execute = async () => {
      try {
        if (!this.isRunning) return;
        
        // Check if market is still open
        if (!this.marketData.isMarketOpen()) {
          console.log('Market closed, stopping trading engine');
          await this.stop();
          return;
        }
        
        // Skip execution if paused
        if (!this.isPaused && this.config.enableAutoTrading) {
          await this.executeStrategy();
        }
        
        // Update risk metrics
        this.updateRiskMetrics();
        
        // Schedule next execution
        this.executionTimer = setTimeout(execute, this.config.executionInterval);
        
      } catch (error) {
        console.error('Execution loop error:', error);
        this.emit('error', { error: error.message, timestamp: new Date() });
        
        // Continue execution despite errors
        this.executionTimer = setTimeout(execute, this.config.executionInterval);
      }
    };
    
    execute();
  }

  /**
   * Execute trading strategy
   */
  async executeStrategy() {
    try {
      // Get current market data
      const marketData = this.getCurrentMarketData();
      if (!marketData) {
        console.log('No market data available, skipping execution');
        return;
      }
      
      // Execute strategy
      const strategyResult = await this.strategy.execute(
        marketData,
        this.orderManager,
        this.riskManager
      );
      
      // Handle strategy result
      await this.handleStrategyResult(strategyResult);
      
    } catch (error) {
      console.error('Strategy execution error:', error);
      this.emit('strategyError', { error: error.message, timestamp: new Date() });
    }
  }

  /**
   * Handle strategy execution results
   */
  async handleStrategyResult(result) {
    switch (result.action) {
      case 'POSITION_ENTERED':
        console.log('Position entered:', result.position);
        this.emit('positionEntered', result);
        break;
        
      case 'TARGET_HIT':
        console.log('Target hit:', result.trade);
        this.recordTrade(result.trade);
        this.emit('targetHit', result);
        break;
        
      case 'STOP_LOSS_HIT':
        console.log('Stop loss hit:', result.trade);
        this.recordTrade(result.trade);
        this.emit('stopLossHit', result);
        break;
        
      case 'MONITORING':
        // Position is being monitored, no action needed
        break;
        
      case 'WAITING':
        console.log('Strategy waiting:', result.reason);
        break;
        
      case 'NO_ACTION':
        // No action taken, this is normal
        break;
        
      case 'ERROR':
        console.error('Strategy error:', result.error);
        this.emit('strategyError', result);
        break;
        
      default:
        console.log('Unknown strategy result:', result);
    }
  }

  /**
   * Perform pre-trading checks
   */
  async performPreTradeChecks() {
    try {
      // Check API connection
      const profile = await this.kite.getProfile();
      if (!profile) {
        return { success: false, error: 'API connection failed' };
      }
      
      // Check available margin
      const margins = await this.kite.getMargins();
      if (margins.equity.available.live_balance < this.config.initialCapital * 0.1) {
        return { success: false, error: 'Insufficient margin available' };
      }
      
      // Check risk limits
      const riskCheck = await this.riskManager.checkDailyLimits(0, 0);
      if (!riskCheck.canTrade) {
        return { success: false, error: riskCheck.reason };
      }
      
      return { success: true };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Subscribe to market data updates
   */
  subscribeToMarketData() {
    for (const instrument of this.config.instruments) {
      this.marketData.subscribe(instrument, (data) => {
        this.emit('marketDataUpdate', { instrument, data });
      });
    }
  }

  /**
   * Get current market data for primary instrument
   */
  getCurrentMarketData() {
    const primaryInstrument = this.config.instruments[0];
    return this.marketData.getCurrentData(primaryInstrument);
  }

  /**
   * Record completed trade
   */
  recordTrade(trade) {
    this.dailyStats.trades.push({
      ...trade,
      timestamp: new Date()
    });
    
    this.dailyStats.totalPnL += trade.pnl;
    
    // Update max drawdown
    if (this.dailyStats.totalPnL < this.dailyStats.maxDrawdown) {
      this.dailyStats.maxDrawdown = this.dailyStats.totalPnL;
    }
    
    // Update risk manager
    this.riskManager.updateDailyStats(trade);
  }

  /**
   * Update risk metrics
   */
  updateRiskMetrics() {
    const riskMetrics = this.riskManager.getRiskMetrics();
    const alerts = this.riskManager.generateRiskAlerts();
    
    if (alerts.length > 0) {
      this.emit('riskAlert', { alerts, metrics: riskMetrics });
    }
    
    // Check for emergency stop
    if (this.riskManager.shouldTriggerEmergencyStop()) {
      console.log('Emergency stop triggered!');
      this.stop();
      this.emit('emergencyStop', { metrics: riskMetrics });
    }
  }

  /**
   * Close all open positions
   */
  async closeAllPositions() {
    try {
      const positionsResult = await this.orderManager.getPositions();
      if (positionsResult.success) {
        const openPositions = positionsResult.positions.net.filter(pos => pos.quantity !== 0);
        
        for (const position of openPositions) {
          const closeOrder = {
            symbol: position.tradingsymbol,
            exchange: position.exchange,
            transaction_type: position.quantity > 0 ? 'SELL' : 'BUY',
            quantity: Math.abs(position.quantity),
            order_type: 'MARKET',
            product: position.product,
            validity: 'DAY'
          };
          
          await this.orderManager.placeOrder(closeOrder);
        }
      }
    } catch (error) {
      console.error('Error closing positions:', error);
    }
  }

  /**
   * Reset daily statistics
   */
  resetDailyStats() {
    this.dailyStats = {
      startTime: new Date(),
      trades: [],
      totalPnL: 0,
      maxDrawdown: 0
    };
    
    this.riskManager.resetDailyStats();
  }

  /**
   * Generate daily report
   */
  generateDailyReport() {
    const endTime = new Date();
    const duration = endTime - this.dailyStats.startTime;
    
    return {
      date: endTime.toISOString().split('T')[0],
      duration: Math.round(duration / 1000 / 60), // minutes
      trades: this.dailyStats.trades.length,
      totalPnL: this.dailyStats.totalPnL,
      maxDrawdown: this.dailyStats.maxDrawdown,
      winRate: this.calculateWinRate(),
      riskMetrics: this.riskManager.getRiskMetrics(),
      marketStatus: this.marketData.getMarketStatus()
    };
  }

  /**
   * Calculate win rate
   */
  calculateWinRate() {
    if (this.dailyStats.trades.length === 0) return 0;
    
    const winningTrades = this.dailyStats.trades.filter(trade => trade.pnl > 0).length;
    return (winningTrades / this.dailyStats.trades.length) * 100;
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      dailyStats: this.dailyStats,
      riskMetrics: this.riskManager.getRiskMetrics(),
      marketStatus: this.marketData.getMarketStatus(),
      activeOrders: this.orderManager.getActiveOrders()
    };
  }

  /**
   * Event system
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event).add(handler);
  }

  emit(event, data) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }
}
