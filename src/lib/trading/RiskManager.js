/**
 * Risk Management Module
 * Handles position sizing, daily limits, and risk controls
 */

export class RiskManager {
  constructor(config = {}) {
    this.config = {
      maxDailyLossPercent: config.maxDailyLossPercent || 2, // 2% of capital
      maxTradesPerDay: config.maxTradesPerDay || 5,
      maxPositionSizePercent: config.maxPositionSizePercent || 10, // 10% of capital
      initialCapital: config.initialCapital || 100000,
      emergencyStopLossPercent: config.emergencyStopLossPercent || 5, // Emergency stop at 5% loss
      maxConsecutiveLosses: config.maxConsecutiveLosses || 3,
      ...config
    };
    
    this.dailyStats = {
      totalPnL: 0,
      tradesCount: 0,
      consecutiveLosses: 0,
      maxDrawdown: 0,
      startingCapital: this.config.initialCapital
    };
    
    this.riskLimits = {
      dailyLossLimit: this.config.initialCapital * this.config.maxDailyLossPercent / 100,
      emergencyStopLimit: this.config.initialCapital * this.config.emergencyStopLossPercent / 100
    };
  }

  /**
   * Check if trading is allowed based on daily limits
   */
  async checkDailyLimits(currentPnL, tradesCount) {
    const checks = {
      canTrade: true,
      reason: '',
      warnings: []
    };

    // Check daily loss limit
    if (Math.abs(currentPnL) >= this.riskLimits.dailyLossLimit) {
      checks.canTrade = false;
      checks.reason = `Daily loss limit reached: ₹${Math.abs(currentPnL).toFixed(2)}`;
      return checks;
    }

    // Check emergency stop loss
    if (Math.abs(currentPnL) >= this.riskLimits.emergencyStopLimit) {
      checks.canTrade = false;
      checks.reason = `Emergency stop loss triggered: ₹${Math.abs(currentPnL).toFixed(2)}`;
      return checks;
    }

    // Check maximum trades per day
    if (tradesCount >= this.config.maxTradesPerDay) {
      checks.canTrade = false;
      checks.reason = `Maximum trades per day reached: ${tradesCount}`;
      return checks;
    }

    // Check consecutive losses
    if (this.dailyStats.consecutiveLosses >= this.config.maxConsecutiveLosses) {
      checks.canTrade = false;
      checks.reason = `Maximum consecutive losses reached: ${this.dailyStats.consecutiveLosses}`;
      return checks;
    }

    // Add warnings for approaching limits
    const lossPercentage = Math.abs(currentPnL) / this.config.initialCapital * 100;
    if (lossPercentage > this.config.maxDailyLossPercent * 0.7) {
      checks.warnings.push(`Approaching daily loss limit: ${lossPercentage.toFixed(2)}%`);
    }

    if (tradesCount >= this.config.maxTradesPerDay * 0.8) {
      checks.warnings.push(`Approaching daily trade limit: ${tradesCount}/${this.config.maxTradesPerDay}`);
    }

    return checks;
  }

  /**
   * Calculate appropriate position size based on risk parameters
   */
  calculatePositionSize(entryPrice, stopLossPrice, riskAmount) {
    const riskPerShare = Math.abs(entryPrice - stopLossPrice);
    const maxShares = Math.floor(riskAmount / riskPerShare);
    
    // Ensure position doesn't exceed maximum position size
    const maxPositionValue = this.config.initialCapital * this.config.maxPositionSizePercent / 100;
    const maxSharesByValue = Math.floor(maxPositionValue / entryPrice);
    
    return Math.min(maxShares, maxSharesByValue);
  }

  /**
   * Validate order before placement
   */
  validateOrder(order, currentPortfolioValue) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check if order value exceeds position size limit
    const orderValue = order.quantity * order.price;
    const maxPositionValue = currentPortfolioValue * this.config.maxPositionSizePercent / 100;
    
    if (orderValue > maxPositionValue) {
      validation.isValid = false;
      validation.errors.push(`Order value ₹${orderValue} exceeds maximum position size ₹${maxPositionValue}`);
    }

    // Check if sufficient capital is available
    if (orderValue > currentPortfolioValue * 0.9) { // Keep 10% buffer
      validation.warnings.push('Order uses more than 90% of available capital');
    }

    return validation;
  }

  /**
   * Update daily statistics after a trade
   */
  updateDailyStats(trade) {
    this.dailyStats.totalPnL += trade.pnl;
    this.dailyStats.tradesCount += 1;
    
    // Track consecutive losses
    if (trade.pnl < 0) {
      this.dailyStats.consecutiveLosses += 1;
    } else {
      this.dailyStats.consecutiveLosses = 0;
    }
    
    // Update max drawdown
    if (this.dailyStats.totalPnL < this.dailyStats.maxDrawdown) {
      this.dailyStats.maxDrawdown = this.dailyStats.totalPnL;
    }
    
    // Log risk metrics
    this.logRiskMetrics();
  }

  /**
   * Check if emergency stop should be triggered
   */
  shouldTriggerEmergencyStop() {
    const currentLoss = Math.abs(this.dailyStats.totalPnL);
    return currentLoss >= this.riskLimits.emergencyStopLimit;
  }

  /**
   * Get current risk metrics
   */
  getRiskMetrics() {
    const currentCapital = this.config.initialCapital + this.dailyStats.totalPnL;
    const returnPercent = (this.dailyStats.totalPnL / this.config.initialCapital) * 100;
    const maxDrawdownPercent = (this.dailyStats.maxDrawdown / this.config.initialCapital) * 100;
    
    return {
      currentCapital,
      dailyPnL: this.dailyStats.totalPnL,
      returnPercent,
      maxDrawdown: this.dailyStats.maxDrawdown,
      maxDrawdownPercent,
      tradesCount: this.dailyStats.tradesCount,
      consecutiveLosses: this.dailyStats.consecutiveLosses,
      riskLimits: this.riskLimits,
      utilizationPercent: {
        dailyLoss: (Math.abs(this.dailyStats.totalPnL) / this.riskLimits.dailyLossLimit) * 100,
        trades: (this.dailyStats.tradesCount / this.config.maxTradesPerDay) * 100
      }
    };
  }

  /**
   * Reset daily statistics (call at start of each trading day)
   */
  resetDailyStats() {
    this.dailyStats = {
      totalPnL: 0,
      tradesCount: 0,
      consecutiveLosses: 0,
      maxDrawdown: 0,
      startingCapital: this.config.initialCapital + this.dailyStats.totalPnL // Carry forward P&L
    };
    
    // Update capital for new day
    this.config.initialCapital = this.dailyStats.startingCapital;
    this.riskLimits.dailyLossLimit = this.config.initialCapital * this.config.maxDailyLossPercent / 100;
    this.riskLimits.emergencyStopLimit = this.config.initialCapital * this.config.emergencyStopLossPercent / 100;
  }

  /**
   * Log risk metrics for monitoring
   */
  logRiskMetrics() {
    const metrics = this.getRiskMetrics();
    console.log('Risk Metrics Update:', {
      timestamp: new Date().toISOString(),
      dailyPnL: metrics.dailyPnL,
      returnPercent: metrics.returnPercent.toFixed(2) + '%',
      tradesCount: metrics.tradesCount,
      consecutiveLosses: metrics.consecutiveLosses,
      utilizationPercent: {
        dailyLoss: metrics.utilizationPercent.dailyLoss.toFixed(1) + '%',
        trades: metrics.utilizationPercent.trades.toFixed(1) + '%'
      }
    });
  }

  /**
   * Generate risk alerts
   */
  generateRiskAlerts() {
    const alerts = [];
    const metrics = this.getRiskMetrics();
    
    // High utilization alerts
    if (metrics.utilizationPercent.dailyLoss > 70) {
      alerts.push({
        level: 'WARNING',
        message: `Daily loss utilization at ${metrics.utilizationPercent.dailyLoss.toFixed(1)}%`,
        action: 'Consider reducing position sizes'
      });
    }
    
    if (metrics.utilizationPercent.trades > 80) {
      alerts.push({
        level: 'WARNING',
        message: `Daily trade limit utilization at ${metrics.utilizationPercent.trades.toFixed(1)}%`,
        action: 'Few trades remaining for today'
      });
    }
    
    // Consecutive losses alert
    if (this.dailyStats.consecutiveLosses >= 2) {
      alerts.push({
        level: 'CAUTION',
        message: `${this.dailyStats.consecutiveLosses} consecutive losses`,
        action: 'Review strategy performance'
      });
    }
    
    // Emergency stop warning
    if (metrics.utilizationPercent.dailyLoss > 90) {
      alerts.push({
        level: 'CRITICAL',
        message: 'Approaching emergency stop loss',
        action: 'Consider manual intervention'
      });
    }
    
    return alerts;
  }

  /**
   * Export daily risk report
   */
  generateDailyReport() {
    const metrics = this.getRiskMetrics();
    const alerts = this.generateRiskAlerts();
    
    return {
      date: new Date().toISOString().split('T')[0],
      summary: {
        startingCapital: this.dailyStats.startingCapital,
        endingCapital: metrics.currentCapital,
        dailyPnL: metrics.dailyPnL,
        returnPercent: metrics.returnPercent,
        tradesExecuted: metrics.tradesCount,
        maxDrawdown: metrics.maxDrawdown
      },
      riskMetrics: metrics,
      alerts: alerts,
      limits: {
        dailyLossLimit: this.riskLimits.dailyLossLimit,
        maxTrades: this.config.maxTradesPerDay,
        emergencyStop: this.riskLimits.emergencyStopLimit
      }
    };
  }
}
