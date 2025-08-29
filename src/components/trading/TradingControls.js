'use client';

import { useState } from 'react';

export default function TradingControls({ engineStatus, onEngineAction, loading }) {
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({
    initialCapital: 100000,
    maxDailyLoss: 2,
    maxTradesPerDay: 5,
    enableAutoTrading: false,
    instruments: ['NSE:NIFTY 50']
  });

  const handleInitialize = () => {
    onEngineAction('initialize', config);
  };

  const handleStart = () => {
    onEngineAction('start');
  };

  const handleStop = () => {
    if (window.confirm('Are you sure you want to stop the trading engine? This will close all open positions.')) {
      onEngineAction('stop');
    }
  };

  const handlePause = () => {
    onEngineAction('pause');
  };

  const handleResume = () => {
    onEngineAction('resume');
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Trading Engine Controls</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Status:</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              engineStatus.isRunning 
                ? (engineStatus.isPaused ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800')
                : 'bg-gray-100 text-gray-800'
            }`}>
              {engineStatus.isRunning 
                ? (engineStatus.isPaused ? 'Paused' : 'Running') 
                : (engineStatus.isInitialized ? 'Stopped' : 'Not Initialized')
              }
            </span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          {!engineStatus.isInitialized && (
            <button
              onClick={handleInitialize}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg font-medium flex items-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : null}
              Initialize Engine
            </button>
          )}

          {engineStatus.isInitialized && !engineStatus.isRunning && (
            <button
              onClick={handleStart}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2 rounded-lg font-medium flex items-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : null}
              Start Trading
            </button>
          )}

          {engineStatus.isRunning && !engineStatus.isPaused && (
            <button
              onClick={handlePause}
              disabled={loading}
              className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-300 text-white px-4 py-2 rounded-lg font-medium"
            >
              Pause
            </button>
          )}

          {engineStatus.isRunning && engineStatus.isPaused && (
            <button
              onClick={handleResume}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2 rounded-lg font-medium"
            >
              Resume
            </button>
          )}

          {engineStatus.isRunning && (
            <button
              onClick={handleStop}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-4 py-2 rounded-lg font-medium"
            >
              Stop Trading
            </button>
          )}

          <button
            onClick={() => setShowConfig(!showConfig)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            {showConfig ? 'Hide Config' : 'Show Config'}
          </button>
        </div>

        {/* Configuration Panel */}
        {showConfig && (
          <div className="border-t pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Engine Configuration</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Capital (₹)
                </label>
                <input
                  type="number"
                  value={config.initialCapital}
                  onChange={(e) => setConfig({...config, initialCapital: parseInt(e.target.value)})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  disabled={engineStatus.isInitialized}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Daily Loss (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={config.maxDailyLoss}
                  onChange={(e) => setConfig({...config, maxDailyLoss: parseFloat(e.target.value)})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  disabled={engineStatus.isInitialized}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Trades Per Day
                </label>
                <input
                  type="number"
                  value={config.maxTradesPerDay}
                  onChange={(e) => setConfig({...config, maxTradesPerDay: parseInt(e.target.value)})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  disabled={engineStatus.isInitialized}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trading Instrument
                </label>
                <select
                  value={config.instruments[0]}
                  onChange={(e) => setConfig({...config, instruments: [e.target.value]})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  disabled={engineStatus.isInitialized}
                >
                  <option value="NSE:NIFTY 50">NIFTY 50</option>
                  <option value="NSE:BANKNIFTY">BANK NIFTY</option>
                  <option value="NSE:RELIANCE">RELIANCE</option>
                  <option value="NSE:TCS">TCS</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.enableAutoTrading}
                  onChange={(e) => setConfig({...config, enableAutoTrading: e.target.checked})}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  disabled={engineStatus.isInitialized}
                />
                <span className="ml-2 text-sm text-gray-700">Enable Automatic Trading</span>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                When enabled, the system will automatically place trades based on the strategy signals.
              </p>
            </div>

            {!engineStatus.isInitialized && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Configuration Notice</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>Configuration can only be changed before initializing the engine. Once initialized, you&apos;ll need to stop and reinitialize to change settings.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
