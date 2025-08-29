/**
 * Trading System Logger
 * Comprehensive logging system for trading operations
 */

export class TradingLogger {
  constructor(config = {}) {
    this.config = {
      logLevel: config.logLevel || 'INFO', // DEBUG, INFO, WARN, ERROR
      enableConsole: config.enableConsole !== false,
      enableFile: config.enableFile || false,
      maxLogSize: config.maxLogSize || 1000, // Max number of log entries
      ...config
    };
    
    this.logs = [];
    this.logLevels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3
    };
  }

  /**
   * Log a message with specified level
   */
  log(level, message, data = {}) {
    const timestamp = new Date();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      id: this.generateLogId()
    };

    // Check if log level meets threshold
    if (this.logLevels[level] >= this.logLevels[this.config.logLevel]) {
      // Add to internal log storage
      this.addToLogs(logEntry);
      
      // Console output
      if (this.config.enableConsole) {
        this.logToConsole(logEntry);
      }
      
      // File output (if enabled)
      if (this.config.enableFile) {
        this.logToFile(logEntry);
      }
    }
  }

  /**
   * Convenience methods for different log levels
   */
  debug(message, data = {}) {
    this.log('DEBUG', message, data);
  }

  info(message, data = {}) {
    this.log('INFO', message, data);
  }

  warn(message, data = {}) {
    this.log('WARN', message, data);
  }

  error(message, data = {}) {
    this.log('ERROR', message, data);
  }

  /**
   * Trading-specific logging methods
   */
  logTrade(trade, action) {
    this.info(`Trade ${action}`, {
      tradeId: trade.id,
      symbol: trade.symbol,
      direction: trade.direction,
      quantity: trade.quantity,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice,
      pnl: trade.pnl,
      action: action
    });
  }

  logOrder(order, status) {
    this.info(`Order ${status}`, {
      orderId: order.orderId,
      symbol: order.symbol,
      orderType: order.order_type,
      quantity: order.quantity,
      price: order.price,
      status: status
    });
  }

  logRiskEvent(event, metrics) {
    this.warn(`Risk Event: ${event}`, {
      event: event,
      dailyPnL: metrics.dailyPnL,
      riskUtilization: metrics.utilizationPercent,
      tradesCount: metrics.tradesCount
    });
  }

  logSystemEvent(event, details = {}) {
    this.info(`System Event: ${event}`, {
      event: event,
      ...details
    });
  }

  logError(error, context = {}) {
    this.error(`Error: ${error.message}`, {
      error: error.message,
      stack: error.stack,
      context: context
    });
  }

  /**
   * Add log entry to internal storage
   */
  addToLogs(logEntry) {
    this.logs.push(logEntry);
    
    // Maintain max log size
    if (this.logs.length > this.config.maxLogSize) {
      this.logs = this.logs.slice(-this.config.maxLogSize);
    }
  }

  /**
   * Output to console with formatting
   */
  logToConsole(logEntry) {
    const timestamp = logEntry.timestamp.toISOString();
    const level = logEntry.level.padEnd(5);
    const message = logEntry.message;
    
    const logString = `[${timestamp}] ${level} ${message}`;
    
    switch (logEntry.level) {
      case 'DEBUG':
        console.debug(logString, logEntry.data);
        break;
      case 'INFO':
        console.info(logString, logEntry.data);
        break;
      case 'WARN':
        console.warn(logString, logEntry.data);
        break;
      case 'ERROR':
        console.error(logString, logEntry.data);
        break;
      default:
        console.log(logString, logEntry.data);
    }
  }

  /**
   * Output to file (placeholder - implement based on environment)
   */
  logToFile(logEntry) {
    // In a browser environment, you might send logs to a server
    // In Node.js, you would write to a file
    // This is a placeholder implementation
    
    if (typeof window === 'undefined') {
      // Server-side logging
      // const fs = require('fs');
      // fs.appendFileSync('trading.log', JSON.stringify(logEntry) + '\n');
    } else {
      // Client-side - could send to server endpoint
      // fetch('/api/logs', { method: 'POST', body: JSON.stringify(logEntry) });
    }
  }

  /**
   * Generate unique log ID
   */
  generateLogId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Get logs with optional filtering
   */
  getLogs(filters = {}) {
    let filteredLogs = [...this.logs];
    
    // Filter by level
    if (filters.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filters.level);
    }
    
    // Filter by time range
    if (filters.startTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startTime);
    }
    
    if (filters.endTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endTime);
    }
    
    // Filter by message content
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        log.message.toLowerCase().includes(searchTerm)
      );
    }
    
    // Limit results
    if (filters.limit) {
      filteredLogs = filteredLogs.slice(-filters.limit);
    }
    
    return filteredLogs.reverse(); // Most recent first
  }

  /**
   * Get log statistics
   */
  getLogStats() {
    const stats = {
      total: this.logs.length,
      byLevel: {
        DEBUG: 0,
        INFO: 0,
        WARN: 0,
        ERROR: 0
      },
      timeRange: {
        oldest: null,
        newest: null
      }
    };
    
    if (this.logs.length > 0) {
      // Count by level
      this.logs.forEach(log => {
        stats.byLevel[log.level]++;
      });
      
      // Time range
      stats.timeRange.oldest = this.logs[0].timestamp;
      stats.timeRange.newest = this.logs[this.logs.length - 1].timestamp;
    }
    
    return stats;
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
    this.info('Logs cleared');
  }

  /**
   * Export logs as JSON
   */
  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Set log level
   */
  setLogLevel(level) {
    if (this.logLevels.hasOwnProperty(level)) {
      this.config.logLevel = level;
      this.info(`Log level set to ${level}`);
    } else {
      this.warn(`Invalid log level: ${level}`);
    }
  }
}

// Create singleton instance
export const tradingLogger = new TradingLogger({
  logLevel: 'INFO',
  enableConsole: true,
  enableFile: false,
  maxLogSize: 1000
});

// Export convenience functions
export const logTrade = (trade, action) => tradingLogger.logTrade(trade, action);
export const logOrder = (order, status) => tradingLogger.logOrder(order, status);
export const logRiskEvent = (event, metrics) => tradingLogger.logRiskEvent(event, metrics);
export const logSystemEvent = (event, details) => tradingLogger.logSystemEvent(event, details);
export const logError = (error, context) => tradingLogger.logError(error, context);
