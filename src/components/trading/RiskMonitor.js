'use client';

export default function RiskMonitor({ riskMetrics = {}, dailyStats = {} }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getUtilizationColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    if (percentage >= 50) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getUtilizationTextColor = (percentage) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 50) return 'text-orange-600';
    return 'text-green-600';
  };

  const dailyLossUtilization = (riskMetrics.dailyLossUtilization || 0) * 100;
  const tradesUtilization = riskMetrics.tradesUtilization || 0;

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Risk Monitor</h3>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              dailyLossUtilization < 50 ? 'bg-green-400' :
              dailyLossUtilization < 80 ? 'bg-yellow-400' : 'bg-red-400'
            }`}></div>
            <span className="text-sm text-gray-600">Risk Level</span>
          </div>
        </div>

        {/* Risk Utilization Bars */}
        <div className="space-y-6">
          {/* Daily Loss Utilization */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Daily Loss Limit</span>
              <span className={`text-sm font-medium ${getUtilizationTextColor(dailyLossUtilization)}`}>
                {dailyLossUtilization.toFixed(1)}% used
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${getUtilizationColor(dailyLossUtilization)}`}
                style={{ width: `${Math.min(dailyLossUtilization, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Current Loss: {formatCurrency(Math.abs(dailyStats.totalPnL || 0))}</span>
              <span>Limit: {formatCurrency(2000)}</span> {/* 2% of 100k */}
            </div>
          </div>

          {/* Trades Utilization */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Daily Trade Limit</span>
              <span className={`text-sm font-medium ${getUtilizationTextColor(tradesUtilization)}`}>
                {tradesUtilization.toFixed(1)}% used
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${getUtilizationColor(tradesUtilization)}`}
                style={{ width: `${Math.min(tradesUtilization, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Trades Today: {dailyStats.tradesCount || 0}</span>
              <span>Limit: 5</span>
            </div>
          </div>
        </div>

        {/* Risk Alerts */}
        {riskMetrics.alerts && riskMetrics.alerts.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-md font-medium text-gray-900 mb-4">Risk Alerts</h4>
            <div className="space-y-3">
              {riskMetrics.alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    alert.level === 'CRITICAL' ? 'bg-red-50 border-red-200' :
                    alert.level === 'WARNING' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {alert.level === 'CRITICAL' ? (
                        <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      ) : alert.level === 'WARNING' ? (
                        <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="ml-3">
                      <h3 className={`text-sm font-medium ${
                        alert.level === 'CRITICAL' ? 'text-red-800' :
                        alert.level === 'WARNING' ? 'text-yellow-800' :
                        'text-blue-800'
                      }`}>
                        {alert.level}
                      </h3>
                      <div className={`mt-2 text-sm ${
                        alert.level === 'CRITICAL' ? 'text-red-700' :
                        alert.level === 'WARNING' ? 'text-yellow-700' :
                        'text-blue-700'
                      }`}>
                        <p>{alert.message}</p>
                        {alert.action && (
                          <p className="mt-1 font-medium">Action: {alert.action}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk Summary */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-4">Risk Summary</h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Consecutive Losses:</span>
              <span className={`ml-2 font-medium ${
                (riskMetrics.consecutiveLosses || 0) >= 2 ? 'text-red-600' : 'text-gray-900'
              }`}>
                {riskMetrics.consecutiveLosses || 0}
              </span>
            </div>
            
            <div>
              <span className="text-gray-600">Max Drawdown:</span>
              <span className="ml-2 font-medium text-red-600">
                {formatCurrency(Math.abs(dailyStats.maxDrawdown || 0))}
              </span>
            </div>
            
            <div>
              <span className="text-gray-600">Risk Level:</span>
              <span className={`ml-2 font-medium ${
                dailyLossUtilization < 50 ? 'text-green-600' :
                dailyLossUtilization < 80 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {dailyLossUtilization < 50 ? 'Low' :
                 dailyLossUtilization < 80 ? 'Medium' : 'High'}
              </span>
            </div>
            
            <div>
              <span className="text-gray-600">Emergency Stop:</span>
              <span className={`ml-2 font-medium ${
                dailyLossUtilization >= 90 ? 'text-red-600' : 'text-green-600'
              }`}>
                {dailyLossUtilization >= 90 ? 'TRIGGERED' : 'Safe'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
