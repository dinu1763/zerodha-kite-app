'use client';

import { useState, useEffect } from 'react';

export default function MarketStatus() {
  const [marketStatus, setMarketStatus] = useState({
    isOpen: false,
    currentTime: new Date(),
    nextOpen: null,
    nextClose: null
  });

  useEffect(() => {
    const updateMarketStatus = () => {
      const now = new Date();
      const day = now.getDay(); // 0 = Sunday, 6 = Saturday
      
      // Check if it's a weekend
      const isWeekend = day === 0 || day === 6;
      
      // Market hours: 9:15 AM to 3:30 PM IST
      const marketOpen = new Date(now);
      marketOpen.setHours(9, 15, 0, 0);
      
      const marketClose = new Date(now);
      marketClose.setHours(15, 30, 0, 0);
      
      const isMarketHours = !isWeekend && now >= marketOpen && now <= marketClose;
      
      // Calculate next open/close times
      let nextOpen = null;
      let nextClose = null;
      
      if (isMarketHours) {
        nextClose = marketClose;
      } else {
        // Calculate next market open
        const nextOpenDate = new Date(now);
        if (isWeekend || now > marketClose) {
          // Move to next Monday if weekend or after market close
          const daysUntilMonday = isWeekend ? (8 - day) % 7 : 1;
          nextOpenDate.setDate(nextOpenDate.getDate() + daysUntilMonday);
        }
        nextOpenDate.setHours(9, 15, 0, 0);
        nextOpen = nextOpenDate;
      }
      
      setMarketStatus({
        isOpen: isMarketHours,
        currentTime: now,
        nextOpen,
        nextClose
      });
    };

    updateMarketStatus();
    const interval = setInterval(updateMarketStatus, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTimeUntil = (targetDate) => {
    if (!targetDate) return '';
    
    const diff = targetDate - marketStatus.currentTime;
    if (diff <= 0) return '';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="flex items-center space-x-4 text-sm">
      {/* Market Status Indicator */}
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${
          marketStatus.isOpen ? 'bg-green-400 animate-pulse' : 'bg-red-400'
        }`}></div>
        <span className={`font-medium ${
          marketStatus.isOpen ? 'text-green-600' : 'text-red-600'
        }`}>
          {marketStatus.isOpen ? 'Market Open' : 'Market Closed'}
        </span>
      </div>

      {/* Current Time */}
      <div className="text-gray-600">
        {formatTime(marketStatus.currentTime)}
      </div>

      {/* Next Event */}
      <div className="text-gray-500">
        {marketStatus.isOpen && marketStatus.nextClose ? (
          <span>
            Closes in {getTimeUntil(marketStatus.nextClose)}
          </span>
        ) : marketStatus.nextOpen ? (
          <span>
            Opens {formatDate(marketStatus.nextOpen)} at {formatTime(marketStatus.nextOpen)}
            {getTimeUntil(marketStatus.nextOpen) && (
              <span className="ml-1">({getTimeUntil(marketStatus.nextOpen)})</span>
            )}
          </span>
        ) : null}
      </div>
    </div>
  );
}
