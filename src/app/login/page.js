'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleZerodhaLogin = () => {
    setIsLoading(true);
    
    // Get the current domain for redirect URL
    const currentDomain = window.location.origin;
    const redirectUrl = `${currentDomain}/api/auth/callback`;
    
    // Zerodha OAuth URL
    const apiKey = process.env.NEXT_PUBLIC_ZERODHA_API_KEY || 'your_api_key_here';
    const zerodhaAuthUrl = `https://kite.trade/connect/login?api_key=${apiKey}&v=3`;
    
    // Redirect to Zerodha login
    window.location.href = zerodhaAuthUrl;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Zerodha Kite Trading
          </h1>
          <p className="text-gray-600">
            Connect your Zerodha account to start trading
          </p>
        </div>

        <div className="space-y-6">
          <button
            onClick={handleZerodhaLogin}
            disabled={isLoading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Connecting...
              </div>
            ) : (
              'Login with Zerodha Kite'
            )}
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-500">
              You will be redirected to Zerodha&apos;s secure login page
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Setup Instructions:</h3>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Create a Kite Connect app at developers.kite.trade</li>
              <li>2. Set the redirect URL to: <code className="bg-blue-100 px-1 rounded">{typeof window !== 'undefined' ? `${window.location.origin}/api/auth/callback` : '[your-domain]/api/auth/callback'}</code></li>
              <li>3. Add your API key to environment variables</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
