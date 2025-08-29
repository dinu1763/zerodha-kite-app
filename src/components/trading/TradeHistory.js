'use client';

export default function TradeHistory({ trades = [], onRefresh }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatTime = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getExitReasonBadge = (reason) => {
    const badges = {
      'TARGET_HIT': 'bg-green-100 text-green-800',
      'STOP_LOSS_HIT': 'bg-red-100 text-red-800',
      'MANUAL_EXIT': 'bg-blue-100 text-blue-800',
      'EOD_EXIT': 'bg-gray-100 text-gray-800'
    };
    
    return badges[reason] || 'bg-gray-100 text-gray-800';
  };

  const getExitReasonText = (reason) => {
    const texts = {
      'TARGET_HIT': 'Target Hit',
      'STOP_LOSS_HIT': 'Stop Loss',
      'MANUAL_EXIT': 'Manual',
      'EOD_EXIT': 'End of Day'
    };
    
    return texts[reason] || reason;
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Trade History</h3>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500">
              {trades.length} trades today
            </span>
            <button
              onClick={onRefresh}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Refresh
            </button>
          </div>
        </div>

        {trades.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No trades yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Trades will appear here once the trading engine starts executing.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Direction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    P&L
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exit Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trades.map((trade, index) => (
                  <tr key={trade.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {trade.symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        trade.direction === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {trade.direction}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">₹{trade.entryPrice}</div>
                        <div className="text-gray-500">{formatTime(trade.entryTime)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">₹{trade.exitPrice}</div>
                        <div className="text-gray-500">{formatTime(trade.exitTime)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {trade.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(trade.pnl)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getExitReasonBadge(trade.exitReason)}`}>
                        {getExitReasonText(trade.exitReason)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {trade.exitTime ? new Date(trade.exitTime).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Trade Summary */}
        {trades.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Trades:</span>
                <span className="ml-2 font-medium">{trades.length}</span>
              </div>
              
              <div>
                <span className="text-gray-600">Winning Trades:</span>
                <span className="ml-2 font-medium text-green-600">
                  {trades.filter(trade => trade.pnl > 0).length}
                </span>
              </div>
              
              <div>
                <span className="text-gray-600">Losing Trades:</span>
                <span className="ml-2 font-medium text-red-600">
                  {trades.filter(trade => trade.pnl < 0).length}
                </span>
              </div>
              
              <div>
                <span className="text-gray-600">Net P&L:</span>
                <span className={`ml-2 font-medium ${
                  trades.reduce((sum, trade) => sum + trade.pnl, 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(trades.reduce((sum, trade) => sum + trade.pnl, 0))}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
