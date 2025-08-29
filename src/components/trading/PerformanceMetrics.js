'use client';

export default function PerformanceMetrics({ dailyStats = {}, performance = {} }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  const metrics = [
    {
      name: 'Daily P&L',
      value: formatCurrency(dailyStats.totalPnL),
      change: dailyStats.totalPnL >= 0 ? 'positive' : 'negative',
      icon: dailyStats.totalPnL >= 0 ? '↗' : '↘'
    },
    {
      name: 'Total Trades',
      value: dailyStats.tradesCount || 0,
      change: 'neutral',
      icon: '📊'
    },
    {
      name: 'Win Rate',
      value: formatPercentage(dailyStats.winRate),
      change: (dailyStats.winRate || 0) >= 50 ? 'positive' : 'negative',
      icon: '🎯'
    },
    {
      name: 'Current Capital',
      value: formatCurrency(dailyStats.currentCapital),
      change: 'neutral',
      icon: '💰'
    },
    {
      name: 'Max Drawdown',
      value: formatCurrency(Math.abs(dailyStats.maxDrawdown || 0)),
      change: 'negative',
      icon: '📉'
    },
    {
      name: 'Profit Factor',
      value: (performance.profitFactor || 0).toFixed(2),
      change: (performance.profitFactor || 0) > 1 ? 'positive' : 'negative',
      icon: '⚖️'
    }
  ];

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Performance Metrics</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {metrics.map((metric, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.name}</p>
                  <p className={`text-2xl font-bold ${
                    metric.change === 'positive' ? 'text-green-600' :
                    metric.change === 'negative' ? 'text-red-600' :
                    'text-gray-900'
                  }`}>
                    {metric.value}
                  </p>
                </div>
                <div className="text-2xl">{metric.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Performance Details */}
        {performance.totalTrades > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-md font-medium text-gray-900 mb-4">Detailed Performance</h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Avg Win:</span>
                <span className="ml-2 font-medium text-green-600">
                  {formatCurrency(performance.avgWin)}
                </span>
              </div>
              
              <div>
                <span className="text-gray-600">Avg Loss:</span>
                <span className="ml-2 font-medium text-red-600">
                  {formatCurrency(performance.avgLoss)}
                </span>
              </div>
              
              <div>
                <span className="text-gray-600">Winning Trades:</span>
                <span className="ml-2 font-medium">{performance.winningTrades || 0}</span>
              </div>
              
              <div>
                <span className="text-gray-600">Losing Trades:</span>
                <span className="ml-2 font-medium">{performance.losingTrades || 0}</span>
              </div>
              
              <div>
                <span className="text-gray-600">Total Return:</span>
                <span className={`ml-2 font-medium ${
                  (performance.totalReturn || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPercentage(performance.totalReturn)}
                </span>
              </div>
              
              <div>
                <span className="text-gray-600">Sharpe Ratio:</span>
                <span className="ml-2 font-medium">
                  {(performance.sharpeRatio || 0).toFixed(2)}
                </span>
              </div>
              
              <div>
                <span className="text-gray-600">Total Wins:</span>
                <span className="ml-2 font-medium text-green-600">
                  {formatCurrency(performance.totalWins)}
                </span>
              </div>
              
              <div>
                <span className="text-gray-600">Total Losses:</span>
                <span className="ml-2 font-medium text-red-600">
                  {formatCurrency(performance.totalLosses)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
