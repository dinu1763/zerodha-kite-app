# Algorithmic Trading System

A comprehensive algorithmic trading system built on top of the Zerodha Kite Connect API, implementing an automated intraday momentum strategy with advanced risk management.

## 🚀 Features

### Core Trading Strategy
- **Automated Intraday Trading**: Executes trades during market hours (10:00 AM - 3:15 PM IST)
- **Dynamic Position Management**: Adjusts position sizes based on profit/loss outcomes
- **Target & Stop Loss Management**: Automated profit taking and loss cutting
- **Candle-based Re-entry**: Waits for hourly candle completion before new trades

### Risk Management
- **Daily Loss Limits**: Maximum 2% capital loss per day
- **Position Sizing**: Configurable position size (default 2% of capital)
- **Trade Limits**: Maximum 5 trades per day
- **Emergency Stop**: Automatic system shutdown on critical losses
- **Consecutive Loss Monitoring**: Tracks and alerts on losing streaks

### Real-time Monitoring
- **Live Trading Dashboard**: Real-time P&L, trade history, and system status
- **Risk Metrics Display**: Visual risk utilization and alert system
- **Market Status Indicator**: Live market hours and countdown timers
- **Performance Analytics**: Win rate, profit factor, Sharpe ratio calculations

## 📋 Strategy Parameters

### Initial Trade Settings
- **Profit Target**: 0.75% from entry price
- **Stop Loss**: 0.35% from entry price
- **Position Size**: 2% of available capital

### Follow-up Trade Settings (After Profit Target Hit)
- **Profit Target**: 0.35% from new entry price
- **Stop Loss**: 0.15% from new entry price
- **Position Size**: 50% of previous position size

### Re-entry Settings (After Stop Loss Hit)
- **Same parameters as initial trade**
- **Full position size restoration**

## 🏗️ System Architecture

```
Trading Dashboard UI
       ↓
Trading Engine Controller
       ↓
┌─────────────┬─────────────┬─────────────┬─────────────┐
│   Strategy  │    Risk     │   Order     │   Market    │
│   Engine    │  Manager    │  Manager    │    Data     │
└─────────────┴─────────────┴─────────────┴─────────────┘
       ↓              ↓              ↓              ↓
┌─────────────┬─────────────┬─────────────┬─────────────┐
│  Position   │   Daily     │  Zerodha    │  Real-time  │
│  Manager    │   Limits    │  Kite API   │   Quotes    │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Zerodha Kite Connect API credentials
- Valid Zerodha trading account

### Environment Variables
Create a `.env.local` file:
```env
NEXT_PUBLIC_ZERODHA_API_KEY=your_api_key
ZERODHA_API_SECRET=your_api_secret
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### Installation
```bash
# Install dependencies
npm install

# Install additional trading dependencies
npm install kiteconnect ws

# Start development server
npm run dev
```

## 🎯 Usage Guide

### 1. Authentication
1. Navigate to `/login`
2. Login with your Zerodha credentials
3. Complete OAuth authorization
4. Access the main dashboard

### 2. Trading Dashboard
1. Click "🤖 Algorithmic Trading Dashboard" from main dashboard
2. Configure trading parameters in the settings panel
3. Initialize the trading engine
4. Start automated trading

### 3. Monitoring
- **Real-time P&L**: Monitor live profit/loss updates
- **Risk Utilization**: Track daily loss and trade limits
- **Trade History**: View all executed trades with details
- **System Status**: Monitor engine status and market hours

## ⚙️ Configuration Options

### Trading Parameters
```javascript
{
  initialCapital: 100000,        // Starting capital (₹)
  maxDailyLoss: 2,              // Max daily loss (%)
  maxTradesPerDay: 5,           // Max trades per day
  instruments: ['NSE:NIFTY 50'], // Trading instruments
  enableAutoTrading: false      // Auto-trading toggle
}
```

### Risk Management
```javascript
{
  maxDailyLossPercent: 2,       // Daily loss limit
  emergencyStopLossPercent: 5,  // Emergency stop
  maxConsecutiveLosses: 3,      // Max consecutive losses
  maxPositionSizePercent: 10    // Max position size
}
```

## 📊 API Endpoints

### Trading Engine Control
- `POST /api/trading/engine` - Control trading engine
  - Actions: `initialize`, `start`, `stop`, `pause`, `resume`
- `GET /api/trading/engine` - Get engine status

### Trading Data
- `GET /api/trading/data` - Get trading data
  - Types: `trades`, `daily-stats`, `risk-metrics`, `performance`
- `POST /api/trading/data` - Update trading data

## 🔒 Security Features

### Risk Controls
- **Daily Loss Limits**: Automatic shutdown on loss thresholds
- **Position Size Limits**: Maximum exposure controls
- **Trade Frequency Limits**: Prevents over-trading
- **Emergency Stop**: Manual and automatic emergency stops

### Data Protection
- **Secure Token Storage**: Encrypted access token management
- **API Rate Limiting**: Prevents API abuse
- **Error Handling**: Comprehensive error catching and logging

## 📈 Performance Metrics

### Key Indicators
- **Total Return**: Overall portfolio performance
- **Win Rate**: Percentage of profitable trades
- **Profit Factor**: Ratio of gross profits to gross losses
- **Sharpe Ratio**: Risk-adjusted return measure
- **Maximum Drawdown**: Largest peak-to-trough decline

### Real-time Monitoring
- **Daily P&L**: Live profit/loss tracking
- **Trade Count**: Number of trades executed
- **Risk Utilization**: Percentage of limits used
- **Consecutive Losses**: Current losing streak

## ⚠️ Important Disclaimers

### Trading Risks
- **Market Risk**: All trading involves risk of loss
- **System Risk**: Technical failures can impact trading
- **Liquidity Risk**: Market conditions may affect execution
- **Regulatory Risk**: Compliance with trading regulations required

### Recommendations
- **Start Small**: Begin with minimal capital for testing
- **Monitor Closely**: Supervise automated trading operations
- **Regular Review**: Analyze performance and adjust parameters
- **Risk Management**: Never risk more than you can afford to lose

## 🔧 Development & Customization

### Adding New Strategies
1. Create new strategy class extending `TradingStrategy`
2. Implement required methods: `execute()`, `generateEntrySignal()`
3. Add strategy to configuration options
4. Test thoroughly in simulation mode

### Custom Indicators
1. Add indicator calculations to `MarketDataService`
2. Update strategy logic to use new indicators
3. Modify dashboard to display indicator values

### Enhanced Risk Management
1. Extend `RiskManager` class with new rules
2. Add custom risk metrics and alerts
3. Implement additional safety mechanisms

## 📞 Support & Documentation

### Resources
- **Zerodha Kite Connect Docs**: https://kite.trade/docs/
- **API Reference**: https://kite.trade/docs/connect/v3/
- **Developer Forum**: https://kite.trade/forum/

### Troubleshooting
- Check API credentials and permissions
- Verify market hours and trading sessions
- Monitor system logs for error messages
- Ensure sufficient margin and capital

---

**⚠️ IMPORTANT**: This is a sophisticated trading system that can result in financial losses. Use only with proper understanding of the risks involved. Always test thoroughly before deploying with real capital.
