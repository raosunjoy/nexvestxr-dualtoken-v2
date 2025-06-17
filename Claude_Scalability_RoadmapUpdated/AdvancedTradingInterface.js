import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Chart as ChartJS, registerables } from 'chart.js';
import { CandlestickController, CandlestickElement } from 'chartjs-chart-financial';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { useTrading } from '../context/TradingContext';
import { getOrderBook, getRecentTrades, getUserOrders, cancelOrder } from '../services/tradingApi';
import { Wallet, TrendingUp, TrendingDown, Activity, BarChart3, Clock, X, RefreshCw } from 'lucide-react';

// Register Chart.js components
ChartJS.register(...registerables, CandlestickController, CandlestickElement);

const AdvancedTradingInterface = ({ selectedPair }) => {
  const { isConnected, userAccount, signTransaction } = useWallet();
  const { user } = useAuth();
  const { portfolioData, activeOrders, setActiveOrders, updatePortfolioData } = useTrading();
  
  const [activeTab, setActiveTab] = useState('orderbook');
  const [chartInstance, setChartInstance] = useState(null);

  // Fetch order book data
  const { data: orderBookData } = useQuery({
    queryKey: ['orderbook', selectedPair],
    queryFn: () => getOrderBook(selectedPair, { depth: 20 }),
    enabled: isConnected,
    refetchInterval: 5000,
  });

  // Fetch recent trades
  const { data: recentTrades } = useQuery({
    queryKey: ['trades', selectedPair],
    queryFn: () => getRecentTrades(selectedPair, { limit: 50 }),
    enabled: isConnected,
    refetchInterval: 5000,
  });

  // Fetch user orders
  const { data: userOrdersData } = useQuery({
    queryKey: ['userOrders', user?.id, selectedPair],
    queryFn: () => getUserOrders({ pairId: selectedPair, status: 'pending', limit: 50 }),
    enabled: !!user && isConnected,
    refetchInterval: 5000,
  });

  // Cancel order mutation
  const cancelOrderMutation = useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => {
      setActiveOrders(prev => prev.filter(order => order.id !== cancelOrderMutation.variables));
    },
  });

  // Initialize chart
  useEffect(() => {
    if (activeTab === 'chart' && recentTrades) {
      const ctx = document.getElementById('priceChart').getContext('2d');
      const chartData = recentTrades.map(trade => ({
        x: new Date(trade.timestamp).getTime(),
        o: trade.price,
        h: trade.price * 1.005, // Simulated high
        l: trade.price * 0.995, // Simulated low
        c: trade.price,
        v: trade.amount,
      }));

      const newChart = new ChartJS(ctx, {
        type: 'candlestick',
        data: {
          datasets: [{
            label: `${selectedPair} Candlestick`,
            data: chartData,
            borderColor: '#10B981',
            color: {
              up: '#10B981',
              down: '#EF4444',
              unchanged: '#6B7280',
            },
          }],
        },
        options: {
          responsive: true,
          scales: {
            x: {
              type: 'time',
              time: { unit: 'hour' },
              title: { display: true, text: 'Time' },
            },
            y: {
              beginAtZero: false,
              title: { display: true, text: 'Price (XRP)' },
            },
          },
          plugins: {
            legend: { display: true },
            tooltip: {
              callbacks: {
                label: context => `O: ${context.raw.o.toFixed(6)} H: ${context.raw.h.toFixed(6)} L: ${context.raw.l.toFixed(6)} C: ${context.raw.c.toFixed(6)}`,
              },
            },
          },
        },
      });

      setChartInstance(newChart);
      return () => newChart.destroy();
    }
  }, [activeTab, recentTrades, selectedPair]);

  const handleOrderBookClick = (price, amount, side) => {
    // Existing implementation
  };

  const handleCancelOrder = (orderId) => {
    cancelOrderMutation.mutate(orderId);
  };

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Wallet</h2>
        <p className="text-gray-600 mb-6">Please connect your XUMM wallet to start trading.</p>
        <button className="bg-blue-600 text-white px-6 py-2 rounded-lg">
          Connect XUMM Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6 p-6">
      {/* Existing order form and tabs */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Existing form and tab navigation */}
          <AnimatePresence mode="wait">
            {activeTab === 'chart' && (
              <motion.div
                key="chart"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="h-64 bg-gray-50 rounded-lg"
              >
                <canvas id="priceChart" />
              </motion.div>
            )}
            {/* Existing orderbook and trades tabs */}
          </AnimatePresence>
        </div>
      </motion.div>
      {/* Existing portfolio and orders section */}
    </div>
  );
};

export default AdvancedTradingInterface;