import { NextResponse } from 'next/server';

// Mock data for demonstration - in production, this would come from your database
let mockTradingData = {
  trades: [
    {
      id: 1,
      symbol: 'NIFTY',
      entryPrice: 19500,
      exitPrice: 19650,
      quantity: 50,
      pnl: 7500,
      entryTime: new Date('2024-01-15T10:00:00'),
      exitTime: new Date('2024-01-15T11:30:00'),
      exitReason: 'TARGET_HIT',
      direction: 'BUY'
    },
    {
      id: 2,
      symbol: 'NIFTY',
      entryPrice: 19650,
      exitPrice: 19580,
      quantity: 25,
      pnl: -1750,
      entryTime: new Date('2024-01-15T12:00:00'),
      exitTime: new Date('2024-01-15T13:15:00'),
      exitReason: 'STOP_LOSS_HIT',
      direction: 'BUY'
    }
  ],
  dailyStats: {
    totalPnL: 5750,
    tradesCount: 2,
    winRate: 50,
    maxDrawdown: -1750,
    startingCapital: 100000,
    currentCapital: 105750
  },
  riskMetrics: {
    dailyLossUtilization: 0.875, // 0.875% of 2% limit
    tradesUtilization: 40, // 2 of 5 trades
    consecutiveLosses: 0,
    alerts: []
  }
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dataType = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit')) || 50;
    
    switch (dataType) {
      case 'trades':
        return NextResponse.json({
          success: true,
          data: mockTradingData.trades.slice(-limit)
        });
        
      case 'daily-stats':
        return NextResponse.json({
          success: true,
          data: mockTradingData.dailyStats
        });
        
      case 'risk-metrics':
        return NextResponse.json({
          success: true,
          data: mockTradingData.riskMetrics
        });
        
      case 'performance':
        return NextResponse.json({
          success: true,
          data: calculatePerformanceMetrics()
        });
        
      default:
        return NextResponse.json({
          success: true,
          data: {
            trades: mockTradingData.trades.slice(-10),
            dailyStats: mockTradingData.dailyStats,
            riskMetrics: mockTradingData.riskMetrics
          }
        });
    }
    
  } catch (error) {
    console.error('Trading data API error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { action, data } = await request.json();
    
    switch (action) {
      case 'add-trade':
        return addTrade(data);
      case 'update-stats':
        return updateDailyStats(data);
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Trading data POST error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

function addTrade(tradeData) {
  const newTrade = {
    id: mockTradingData.trades.length + 1,
    ...tradeData,
    timestamp: new Date()
  };
  
  mockTradingData.trades.push(newTrade);
  
  // Update daily stats
  mockTradingData.dailyStats.totalPnL += tradeData.pnl;
  mockTradingData.dailyStats.tradesCount += 1;
  
  // Recalculate win rate
  const winningTrades = mockTradingData.trades.filter(trade => trade.pnl > 0).length;
  mockTradingData.dailyStats.winRate = (winningTrades / mockTradingData.trades.length) * 100;
  
  // Update max drawdown
  if (tradeData.pnl < 0 && tradeData.pnl < mockTradingData.dailyStats.maxDrawdown) {
    mockTradingData.dailyStats.maxDrawdown = tradeData.pnl;
  }
  
  return NextResponse.json({
    success: true,
    message: 'Trade added successfully',
    trade: newTrade
  });
}

function updateDailyStats(statsData) {
  mockTradingData.dailyStats = {
    ...mockTradingData.dailyStats,
    ...statsData
  };
  
  return NextResponse.json({
    success: true,
    message: 'Daily stats updated successfully'
  });
}

function calculatePerformanceMetrics() {
  const trades = mockTradingData.trades;
  
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      totalReturn: 0
    };
  }
  
  const winningTrades = trades.filter(trade => trade.pnl > 0);
  const losingTrades = trades.filter(trade => trade.pnl < 0);
  
  const totalWins = winningTrades.reduce((sum, trade) => sum + trade.pnl, 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.pnl, 0));
  
  const avgWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
  
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
  
  // Calculate running P&L for drawdown calculation
  let runningPnL = 0;
  let peak = 0;
  let maxDrawdown = 0;
  
  trades.forEach(trade => {
    runningPnL += trade.pnl;
    if (runningPnL > peak) {
      peak = runningPnL;
    }
    const drawdown = peak - runningPnL;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });
  
  // Simple Sharpe ratio calculation (assuming risk-free rate of 0)
  const returns = trades.map(trade => trade.pnl / mockTradingData.dailyStats.startingCapital);
  const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const returnStdDev = Math.sqrt(
    returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
  );
  const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0;
  
  return {
    totalTrades: trades.length,
    winRate: (winningTrades.length / trades.length) * 100,
    avgWin: avgWin,
    avgLoss: avgLoss,
    profitFactor: profitFactor,
    sharpeRatio: sharpeRatio * Math.sqrt(252), // Annualized
    maxDrawdown: maxDrawdown,
    totalReturn: (mockTradingData.dailyStats.totalPnL / mockTradingData.dailyStats.startingCapital) * 100,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    totalWins: totalWins,
    totalLosses: totalLosses
  };
}
