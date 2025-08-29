'use client';

import { useState, useEffect } from 'react';
import TradingControls from './trading/TradingControls';
import PerformanceMetrics from './trading/PerformanceMetrics';
import TradeHistory from './trading/TradeHistory';
import RiskMonitor from './trading/RiskMonitor';
import MarketStatus from './trading/MarketStatus';

export default function TradingDashboard() {
  const [engineStatus, setEngineStatus] = useState({
    isRunning: false,
    isPaused: false,
    isInitialized: false
  });
  
  const [tradingData, setTradingData] = useState({
    trades: [],
    dailyStats: {},
    riskMetrics: {},
    performance: {}
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTradingData();
    loadEngineStatus();
    
    // Set up polling for real-time updates
    const interval = setInterval(() => {
      loadTradingData();
      loadEngineStatus();
    }, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  const loadTradingData = async () => {
    try {
      const response = await fetch('/api/trading/data');
      const result = await response.json();
      
      if (result.success) {
        setTradingData(result.data);
      }
    } catch (error) {
      console.error('Error loading trading data:', error);
      setError('Failed to load trading data');
    }
  };

  const loadEngineStatus = async () => {
    try {
      const response = await fetch('/api/trading/engine');
      const result = await response.json();
      
      if (result.success) {
        setEngineStatus(result.status);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading engine status:', error);
      setLoading(false);
    }
  };

  const handleEngineAction = async (action, config = {}) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/trading/engine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('zerodha_access_token')}`
        },
        body: JSON.stringify({ action, config })
      });
      
      const result = await response.json();
      
      if (result.success) {
        await loadEngineStatus();
        if (action === 'stop' && result.dailyReport) {
          // Handle daily report
          console.log('Daily Report:', result.dailyReport);
        }
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Engine action error:', error);
      setError('Failed to execute engine action');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !engineStatus.isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Algorithmic Trading Dashboard</h1>
              <div className="ml-4 flex items-center">
                <div className={`w-3 h-3 rounded-full ${engineStatus.isRunning ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                <span className="ml-2 text-sm text-gray-600">
                  {engineStatus.isRunning ? (engineStatus.isPaused ? 'Paused' : 'Running') : 'Stopped'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <MarketStatus />
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="text-gray-500 hover:text-gray-700"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => setError(null)}
                    className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Trading Controls */}
          <div className="mb-8">
            <TradingControls 
              engineStatus={engineStatus}
              onEngineAction={handleEngineAction}
              loading={loading}
            />
          </div>

          {/* Performance Overview */}
          <div className="mb-8">
            <PerformanceMetrics 
              dailyStats={tradingData.dailyStats}
              performance={tradingData.performance}
            />
          </div>

          {/* Risk Monitor */}
          <div className="mb-8">
            <RiskMonitor 
              riskMetrics={tradingData.riskMetrics}
              dailyStats={tradingData.dailyStats}
            />
          </div>

          {/* Trade History */}
          <div className="mb-8">
            <TradeHistory 
              trades={tradingData.trades}
              onRefresh={loadTradingData}
            />
          </div>

          {/* Strategy Configuration */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Strategy Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Initial Capital</label>
                  <div className="mt-1 text-sm text-gray-900">₹1,00,000</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Profit Target</label>
                  <div className="mt-1 text-sm text-gray-900">0.75% (Initial) / 0.35% (Follow-up)</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stop Loss</label>
                  <div className="mt-1 text-sm text-gray-900">0.35% (Initial) / 0.15% (Follow-up)</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Max Daily Loss</label>
                  <div className="mt-1 text-sm text-gray-900">2% of Capital</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Max Trades/Day</label>
                  <div className="mt-1 text-sm text-gray-900">5 Trades</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Trading Hours</label>
                  <div className="mt-1 text-sm text-gray-900">10:00 AM - 3:15 PM IST</div>
                </div>
              </div>
              
              <div className="mt-6">
                <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm">
                  Modify Strategy Parameters
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
