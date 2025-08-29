/**
 * Order Management System
 * Handles order placement, modification, and tracking with Zerodha Kite API
 */

export class OrderManager {
  constructor(kiteConnect, config = {}) {
    this.kite = kiteConnect;
    this.config = {
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000, // 1 second
      orderTimeout: config.orderTimeout || 30000, // 30 seconds
      ...config
    };
    
    this.activeOrders = new Map();
    this.orderHistory = [];
    this.pendingOrders = new Map();
  }

  /**
   * Place a new order with retry logic
   */
  async placeOrder(orderParams, retryCount = 0) {
    try {
      console.log('Placing order:', orderParams);
      
      // Validate order parameters
      const validation = this.validateOrderParams(orderParams);
      if (!validation.isValid) {
        throw new Error(`Order validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Place order via Kite API
      const response = await this.kite.placeOrder('regular', orderParams);
      
      if (response.order_id) {
        const order = {
          orderId: response.order_id,
          params: orderParams,
          status: 'PENDING',
          placedAt: new Date(),
          attempts: retryCount + 1
        };
        
        this.activeOrders.set(response.order_id, order);
        this.orderHistory.push(order);
        
        // Start monitoring the order
        this.monitorOrder(response.order_id);
        
        return {
          success: true,
          order_id: response.order_id,
          message: 'Order placed successfully'
        };
      } else {
        throw new Error('No order ID received from API');
      }
      
    } catch (error) {
      console.error(`Order placement attempt ${retryCount + 1} failed:`, error.message);
      
      // Retry logic
      if (retryCount < this.config.retryAttempts) {
        console.log(`Retrying order placement in ${this.config.retryDelay}ms...`);
        await this.delay(this.config.retryDelay);
        return this.placeOrder(orderParams, retryCount + 1);
      }
      
      return {
        success: false,
        error: error.message,
        attempts: retryCount + 1
      };
    }
  }

  /**
   * Place bracket order (entry + target + stop loss)
   */
  async placeBracketOrder(entryParams, targetPrice, stopLossPrice) {
    try {
      // Calculate target and stop loss quantities
      const targetQuantity = entryParams.quantity;
      const stopLossQuantity = entryParams.quantity;
      
      // Place main entry order
      const entryResult = await this.placeOrder(entryParams);
      
      if (!entryResult.success) {
        return entryResult;
      }
      
      // Wait for entry order to be filled
      const entryOrder = await this.waitForOrderFill(entryResult.order_id);
      
      if (entryOrder.status === 'COMPLETE') {
        // Place target order
        const targetParams = {
          ...entryParams,
          transaction_type: entryParams.transaction_type === 'BUY' ? 'SELL' : 'BUY',
          order_type: 'LIMIT',
          price: targetPrice,
          quantity: targetQuantity,
          tag: `TARGET_${entryResult.order_id}`
        };
        
        // Place stop loss order
        const stopLossParams = {
          ...entryParams,
          transaction_type: entryParams.transaction_type === 'BUY' ? 'SELL' : 'BUY',
          order_type: 'SL',
          price: stopLossPrice,
          trigger_price: stopLossPrice,
          quantity: stopLossQuantity,
          tag: `SL_${entryResult.order_id}`
        };
        
        const [targetResult, stopLossResult] = await Promise.all([
          this.placeOrder(targetParams),
          this.placeOrder(stopLossParams)
        ]);
        
        return {
          success: true,
          entryOrderId: entryResult.order_id,
          targetOrderId: targetResult.success ? targetResult.order_id : null,
          stopLossOrderId: stopLossResult.success ? stopLossResult.order_id : null,
          message: 'Bracket order placed successfully'
        };
      } else {
        return {
          success: false,
          error: 'Entry order was not filled',
          entryOrderId: entryResult.order_id
        };
      }
      
    } catch (error) {
      console.error('Bracket order placement failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Modify an existing order
   */
  async modifyOrder(orderId, modifications) {
    try {
      const response = await this.kite.modifyOrder('regular', orderId, modifications);
      
      if (this.activeOrders.has(orderId)) {
        const order = this.activeOrders.get(orderId);
        order.modifications = order.modifications || [];
        order.modifications.push({
          ...modifications,
          modifiedAt: new Date()
        });
      }
      
      return {
        success: true,
        order_id: orderId,
        message: 'Order modified successfully'
      };
      
    } catch (error) {
      console.error('Order modification failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId) {
    try {
      const response = await this.kite.cancelOrder('regular', orderId);
      
      if (this.activeOrders.has(orderId)) {
        const order = this.activeOrders.get(orderId);
        order.status = 'CANCELLED';
        order.cancelledAt = new Date();
        this.activeOrders.delete(orderId);
      }
      
      return {
        success: true,
        order_id: orderId,
        message: 'Order cancelled successfully'
      };
      
    } catch (error) {
      console.error('Order cancellation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId) {
    try {
      const orders = await this.kite.getOrders();
      const order = orders.find(o => o.order_id === orderId);
      
      if (order) {
        // Update local order status
        if (this.activeOrders.has(orderId)) {
          const localOrder = this.activeOrders.get(orderId);
          localOrder.status = order.status;
          localOrder.lastUpdated = new Date();
          
          if (order.status === 'COMPLETE' || order.status === 'CANCELLED' || order.status === 'REJECTED') {
            this.activeOrders.delete(orderId);
          }
        }
        
        return {
          success: true,
          order: order
        };
      } else {
        return {
          success: false,
          error: 'Order not found'
        };
      }
      
    } catch (error) {
      console.error('Failed to get order status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Monitor order status until completion or timeout
   */
  async monitorOrder(orderId) {
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds
    
    const monitor = async () => {
      try {
        const statusResult = await this.getOrderStatus(orderId);
        
        if (statusResult.success) {
          const order = statusResult.order;
          
          if (order.status === 'COMPLETE') {
            console.log(`Order ${orderId} completed successfully`);
            this.onOrderComplete(order);
            return;
          } else if (order.status === 'CANCELLED' || order.status === 'REJECTED') {
            console.log(`Order ${orderId} ${order.status.toLowerCase()}: ${order.status_message}`);
            this.onOrderFailed(order);
            return;
          }
        }
        
        // Check timeout
        if (Date.now() - startTime > this.config.orderTimeout) {
          console.log(`Order ${orderId} monitoring timeout`);
          return;
        }
        
        // Continue monitoring
        setTimeout(monitor, checkInterval);
        
      } catch (error) {
        console.error(`Error monitoring order ${orderId}:`, error);
      }
    };
    
    monitor();
  }

  /**
   * Wait for order to be filled
   */
  async waitForOrderFill(orderId, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkStatus = async () => {
        try {
          const statusResult = await this.getOrderStatus(orderId);
          
          if (statusResult.success) {
            const order = statusResult.order;
            
            if (order.status === 'COMPLETE') {
              resolve(order);
              return;
            } else if (order.status === 'CANCELLED' || order.status === 'REJECTED') {
              reject(new Error(`Order ${order.status.toLowerCase()}: ${order.status_message}`));
              return;
            }
          }
          
          if (Date.now() - startTime > timeout) {
            reject(new Error('Order fill timeout'));
            return;
          }
          
          setTimeout(checkStatus, 2000);
          
        } catch (error) {
          reject(error);
        }
      };
      
      checkStatus();
    });
  }

  /**
   * Get all active orders
   */
  getActiveOrders() {
    return Array.from(this.activeOrders.values());
  }

  /**
   * Get order history
   */
  getOrderHistory(limit = 50) {
    return this.orderHistory.slice(-limit);
  }

  /**
   * Validate order parameters
   */
  validateOrderParams(params) {
    const validation = {
      isValid: true,
      errors: []
    };
    
    // Required fields
    const requiredFields = ['symbol', 'exchange', 'transaction_type', 'quantity', 'order_type', 'product'];
    
    for (const field of requiredFields) {
      if (!params[field]) {
        validation.errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Validate quantity
    if (params.quantity && params.quantity <= 0) {
      validation.errors.push('Quantity must be greater than 0');
    }
    
    // Validate price for limit orders
    if (params.order_type === 'LIMIT' && (!params.price || params.price <= 0)) {
      validation.errors.push('Price is required for limit orders');
    }
    
    // Validate trigger price for stop loss orders
    if (params.order_type === 'SL' && (!params.trigger_price || params.trigger_price <= 0)) {
      validation.errors.push('Trigger price is required for stop loss orders');
    }
    
    validation.isValid = validation.errors.length === 0;
    return validation;
  }

  /**
   * Event handlers
   */
  onOrderComplete(order) {
    console.log('Order completed:', order.order_id);
    // Emit event or call callback
  }

  onOrderFailed(order) {
    console.log('Order failed:', order.order_id, order.status_message);
    // Emit event or call callback
  }

  /**
   * Utility methods
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current positions
   */
  async getPositions() {
    try {
      const positions = await this.kite.getPositions();
      return {
        success: true,
        positions: positions
      };
    } catch (error) {
      console.error('Failed to get positions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get holdings
   */
  async getHoldings() {
    try {
      const holdings = await this.kite.getHoldings();
      return {
        success: true,
        holdings: holdings
      };
    } catch (error) {
      console.error('Failed to get holdings:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
