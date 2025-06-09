import React, { useState, useEffect, useContext, useCallback } from 'react';
import { XummContext } from '../../context/XummContext';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Wallet, 
  Clock, 
  Target,
  Shield,
  Zap,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Activity,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  X,
  Plus,
  Minus,
  Droplet,
  Layers
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import IntercomChat from '../Support/IntercomChat';

const AdvancedTradingInterface = ({ selectedPair = 'JVCOIMB789/XRP' }) => {
  const { isConnected, userAccount, createPayload } = useContext(XummContext);
  const { user } = useContext(AuthContext);

  // Trading state
  const [orderType, setOrderType] = useState('limit');
  const [orderSide, setOrderSide] = useState('buy');
  const [orderForm, setOrderForm] = useState({
    amount: '',
    price: '',
    stopPrice: '',
    targetPrice: '',
    postOnly: false,
    reduceOnly: false,
    leverage: 1,
    liquidityAmount: '',
    liquidityXRP: '',
  });

  // Market data state
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const [tradingMetrics, setTradingMetrics] = useState(null);
  const [recentTrades, setRecentTrades] = useState([]);
  const [chartData, setChartData] = useState([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('orderbook');
  const [showLiquidityModal, setShowLiquidityModal] = useState(false);
  const [showMarginOptions, setShowMarginOptions] = useState(false);

  // Portfolio state
  const [portfolio, setPortfolio] = useState(null);
  const [openOrders, setOpenOrders] = useState([]);

  useEffect(() => {
    if (isConnected && selectedPair) {
      loadMarketData();
      loadPortfolio();
      loadChartData();
      
      // Setup real-time updates
      const interval = setInterval(() => {
        loadMarketData();
        loadChartData();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isConnected, selectedPair]);

  const loadMarketData = useCallback(async () => {
    try {
      const [orderBookRes, priceRes, metricsRes, tradesRes] = await Promise.all([
        axios.get(`/api/advanced-trade/orderbook/${selectedPair}?depth=15`),
        axios.get(`/api/advanced-trade/price/${selectedPair}`),
        axios.get(`/api/advanced-trade/metrics/${selectedPair}?timeframe=24h`),
        axios.get(`/api/advanced-trade/trades/${selectedPair}?limit=20`)
      ]);

      setOrderBook(orderBookRes.data.data);
      setCurrentPrice(priceRes.data.data.price);
      setPriceChange(priceRes.data.data.change24h);
      setTradingMetrics(metricsRes.data.data);
      setRecentTrades(tradesRes.data.data);

    } catch (error) {
      console.error('Market data load failed:', error);
    }
  }, [selectedPair]);

  const loadPortfolio = useCallback(async () => {
    try {
      if (!userAccount) return;

      const [portfolioRes, ordersRes] = await Promise.all([
        axios.get(`/api/advanced-trade/portfolio/${userAccount}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('/api/advanced-trade/orders/open', {
          params: { userAddress: userAccount, pairId: selectedPair },
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      setPortfolio(portfolioRes.data.data);
      setOpenOrders(ordersRes.data.data);

    } catch (error) {
      console.error('Portfolio load failed:', error);
    }
  }, [userAccount, selectedPair]);

  const loadChartData = useCallback(async () => {
    try {
      // Mock chart data for beta (in production, fetch from API)
      const mockData = Array.from({ length: 24 }, (_, i) => ({
        time: new Date(Date.now() - (24 - i) * 3600 * 1000).toLocaleTimeString(),
        price: currentPrice * (0.95 + Math.random() * 0.1),
      }));
      setChartData(mockData);
    } catch (error) {
      console.error('Chart data load failed:', error);
    }
  }, [currentPrice]);

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (!isConnected) {
      setError('Please connect your XUMM wallet first');
      return;
    }

    try {
      setLoading(true);
      setError('');

      let endpoint = '/api/advanced-trade/';
      let payload = {
        userAddress: userAccount,
        pairId: selectedPair,
        ...orderForm
      };

      // Determine endpoint based on order type
      switch (orderType) {
        case 'market':
          endpoint += orderSide === 'buy' ? 'market/buy' : 'market/sell';
          payload = {
            ...payload,
            quoteAmount: parseFloat(orderForm.amount) * currentPrice
          };
          break;
        case 'limit':
          endpoint += 'limit';
          payload = {
            ...payload,
            side: orderSide,
            amount: parseFloat(orderForm.amount),
            price: parseFloat(orderForm.price),
            options: {
              postOnly: orderForm.postOnly,
              reduceOnly: orderForm.reduceOnly
            }
          };
          break;
        case 'stop-loss':
          endpoint += 'stop-loss';
          payload = {
            ...payload,
            side: orderSide,
            amount: parseFloat(orderForm.amount),
            stopPrice: parseFloat(orderForm.stopPrice),
            limitPrice: orderForm.price ? parseFloat(orderForm.price) : null
          };
          break;
        case 'oco':
          endpoint += 'oco';
          payload = {
            ...payload,
            side: orderSide,
            amount: parseFloat(orderForm.amount),
            stopPrice: parseFloat(orderForm.stopPrice),
            limitPrice: parseFloat(orderForm.price),
            targetPrice: parseFloat(orderForm.targetPrice)
          };
          break;
        case 'margin':
          endpoint += 'margin';
          payload = {
            ...payload,
            side: orderSide,
            amount: parseFloat(orderForm.amount),
            price: parseFloat(orderForm.price),
            leverage: parseFloat(orderForm.leverage)
          };
          break;
      }

      const response = await axios.post(endpoint, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success) {
        const { transactions } = response.data.data;

        // Sign transactions with XUMM
        for (const tx of transactions || []) {
          await createPayload({ txjson: tx });
        }

        setSuccess(`${orderType} ${orderSide} order created successfully!`);
        setOrderForm({
          amount: '',
          price: '',
          stopPrice: '',
          targetPrice: '',
          postOnly: false,
          reduceOnly: false,
          leverage: 1,
          liquidityAmount: '',
          liquidityXRP: '',
        });

        // Refresh data
        loadMarketData();
        loadPortfolio();
      }

    } catch (error) {
      setError(error.response?.data?.details || error.message || 'Order creation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLiquidity = async (e) => {
    e.preventDefault();
    if (!isConnected) {
      setError('Please connect your XUMM wallet first');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        userAddress: userAccount,
        pairId: selectedPair,
        tokenAmount: parseFloat(orderForm.liquidityAmount),
        xrpAmount: parseFloat(orderForm.liquidityXRP),
      };

      const response = await axios.post('/api/advanced-trade/liquidity/add', payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success) {
        const { transaction } = response.data.data;
        await createPayload({ txjson: transaction });

        setSuccess('Liquidity added successfully!');
        setOrderForm(prev => ({ ...prev, liquidityAmount: '', liquidityXRP: '' }));
        setShowLiquidityModal(false);
        loadPortfolio();
      }
    } catch (error) {
      setError(error.response?.data?.details || error.message || 'Liquidity addition failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderBookClick = (price, amount, side) => {
    setOrderSide(side);
    setOrderForm(prev => ({
      ...prev,
      price: price.toString(),
      amount: amount.toString()
    }));
  };

  const calculateOrderValue = () => {
    const amount = parseFloat(orderForm.amount) || 0;
    const price = parseFloat(orderForm.price) || currentPrice;
    return amount * price * (orderType === 'margin' ? orderForm.leverage : 1);
  };

  const getAvailableBalance = () => {
    if (!portfolio) return 0;
    
    if (orderSide === 'buy') {
      return portfolio.xrpBalance;
    } else {
      const tokenBalance = portfolio.tokenBalances.find(
        balance => balance.currency === selectedPair.split('/')[0]
      );
      return tokenBalance ? parseFloat(tokenBalance.balance) : 0;
    }
  };

  const cancelOrder = async (orderId) => {
    try {
      await axios.delete(`/api/advanced-trade/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        data: { userAddress: userAccount }
      });
      
      loadPortfolio();
      setSuccess('Order cancelled successfully');
    } catch (error) {
      setError('Failed to cancel order');
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <Wallet className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
        <p className="text-gray-600 mb-6">Connect your XUMM wallet to start trading</p>
        <button className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors">
          Connect XUMM Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Trading Form */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Place Order</h3>
            <div className="flex items-center space-x-2 text-sm">
              <span className={`text-${priceChange >= 0 ? 'green' : 'red'}-600 flex items-center`}>
                {priceChange >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                {currentPrice.toFixed(6)} XRP
              </span>
              <span className={`text-${priceChange >= 0 ? 'green' : 'red'}-600`}>
                ({priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
              <span className="text-red-800 text-sm">{error}</span>
              <button onClick={() => setError('')} className="ml-auto text-red-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
              <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
              <span className="text-green-800 text-sm">{success}</span>
              <button onClick={() => setSuccess('')} className="ml-auto text-green-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Order Type Selector */}
          <div className="mb-4">
            <div className="grid grid-cols-3 gap-2">
              {['market', 'limit', 'stop-loss', 'oco', 'margin'].map((type) => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={`py-2 px-3 text-xs font-medium rounded-lg transition-colors ${
                    orderType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {type.replace('-', ' ').toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Buy/Sell Selector */}
          <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setOrderSide('buy')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                orderSide === 'buy'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setOrderSide('sell')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                orderSide === 'sell'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sell
            </button>
          </div>

          {/* Order Form */}
          <form onSubmit={handleOrderSubmit} className="space-y-4">
            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount ({selectedPair.split('/')[0]})
              </label>
              <input
                type="number"
                value={orderForm.amount}
                onChange={(e) => setOrderForm(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
              <div className="mt-1 text-xs text-gray-500">
                Available: {getAvailableBalance().toFixed(6)} {orderSide === 'buy' ? 'XRP' : selectedPair.split('/')[0]}
              </div>
            </div>

            {/* Price Input (for limit orders) */}
            {(orderType === 'limit' || orderType === 'stop-loss' || orderType === 'oco' || orderType === 'margin') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {orderType === 'stop-loss' ? 'Limit Price' : 'Price'} (XRP)
                </label>
                <input
                  type="number"
                  value={orderForm.price}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={currentPrice.toFixed(6)}
                  step="0.000001"
                  min="0"
                  required={orderType !== 'market'}
                />
              </div>
            )}

            {/* Stop Price (for stop-loss and OCO orders) */}
            {(orderType === 'stop-loss' || orderType === 'oco') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stop Price (XRP)
                </label>
                <input
                  type="number"
                  value={orderForm.stopPrice}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, stopPrice: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.000000"
                  step="0.000001"
                  min="0"
                  required
                />
              </div>
            )}

            {/* Target Price (for OCO orders) */}
            {orderType === 'oco' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Price (XRP)
                </label>
                <input
                  type="number"
                  value={orderForm.targetPrice}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, targetPrice: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.000000"
                  step="0.000001"
                  min="0"
                  required
                />
              </div>
            )}

            {/* Margin Options */}
            {orderType === 'margin' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Leverage
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowMarginOptions(!showMarginOptions)}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    {showMarginOptions ? 'Hide' : 'Adjust Leverage'}
                  </button>
                </div>
                {showMarginOptions && (
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={orderForm.leverage}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, leverage: e.target.value }))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>1x</span>
                      <span>{orderForm.leverage}x</span>
                      <span>10x</span>
                    </div>
                    <p className="text-xs text-yellow-600">
                      Higher leverage increases risk. Use with caution.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Advanced Options */}
            {orderType === 'limit' && (
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={orderForm.postOnly}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, postOnly: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Post Only</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={orderForm.reduceOnly}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, reduceOnly: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Reduce Only</span>
                </label>
              </div>
            )}

            {/* Order Summary */}
            {orderForm.amount && (orderForm.price || orderType === 'market') && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-medium">{calculateOrderValue().toFixed(6)} XRP</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Est. Fee:</span>
                  <span className="font-medium">{(calculateOrderValue() * 0.002).toFixed(6)} XRP</span>
                </div>
                {orderType === 'margin' && (
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600">Leverage:</span>
                    <span className="font-medium">{orderForm.leverage}x</span>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !orderForm.amount}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
                orderSide === 'buy'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {orderType === 'market' && <Zap className="h-4 w-4" />}
                  {orderType === 'limit' && <Target className="h-4 w-4" />}
                  {orderType === 'stop-loss' && <Shield className="h-4 w-4" />}
                  {orderType === 'oco' && <Activity className="h-4 w-4" />}
                  {orderType === 'margin' && <Layers className="h-4 w-4" />}
                  <span>
                    {orderSide === 'buy' ? 'Buy' : 'Sell'} {selectedPair.split('/')[0]}
                  </span>
                </>
              )}
            </button>

            {/* Liquidity Pool Button */}
            <button
              type="button"
              onClick={() => setShowLiquidityModal(true)}
              className="w-full mt-2 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Droplet className="h-4 w-4" />
              <span>Add Liquidity</span>
            </button>
          </form>
        </div>

        {/* Liquidity Modal */}
        {showLiquidityModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Add Liquidity</h3>
                <button onClick={() => setShowLiquidityModal(false)} className="text-gray-600 hover:text-gray-800">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddLiquidity} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {selectedPair.split('/')[0]} Amount
                  </label>
                  <input
                    type="number"
                    value={orderForm.liquidityAmount}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, liquidityAmount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    XRP Amount
                  </label>
                  <input
                    type="number"
                    value={orderForm.liquidityXRP}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, liquidityXRP: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    step="0.000001"
                    min="0"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !orderForm.liquidityAmount || !orderForm.liquidityXRP}
                  className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Liquidity'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Market Data */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow-md">
          {/* Market Stats */}
          <div className="p-4 border-b border-gray-200">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-gray-500">24h Volume</div>
                <div className="text-sm font-medium">
                  {tradingMetrics?.volume?.toFixed(2) || '0.00'} XRP
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">24h High</div>
                <div className="text-sm font-medium text-green-600">
                  {tradingMetrics?.high?.toFixed(6) || '0.000000'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">24h Low</div>
                <div className="text-sm font-medium text-red-600">
                  {tradingMetrics?.low?.toFixed(6) || '0.000000'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Spread</div>
                <div className="text-sm font-medium">
                  {orderBook.spread?.toFixed(6) || '0.000000'}
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200">
            {['orderbook', 'trades', 'chart'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {activeTab === 'orderbook' && (
              <div className="grid grid-cols-2 gap-4">
                {/* Bids */}
                <div>
                  <h4 className="text-sm font-medium text-green-600 mb-2">Bids</h4>
                  <div className="space-y-1">
                    {orderBook.bids?.slice(0, 10).map((bid, index) => (
                      <div
                        key={index}
                        onClick={() => handleOrderBookClick(bid.price, bid.amount, 'sell')}
                        className="grid grid-cols-3 gap-2 text-xs py-1 hover:bg-green-50 cursor-pointer rounded"
                      >
                        <span className="text-green-600 font-medium">{bid.price?.toFixed(6) || '0.000000'}</span>
                        <span className="text-gray-600">{bid.amount?.toFixed(2) || '0.00'}</span>
                        <span className="text-gray-500">{((bid.price || 0) * (bid.amount || 0)).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Asks */}
                <div>
                  <h4 className="text-sm font-medium text-red-600 mb-2">Asks</h4>
                  <div className="space-y-1">
                    {orderBook.asks?.slice(0, 10).map((ask, index) => (
                      <div
                        key={index}
                        onClick={() => handleOrderBookClick(ask.price, ask.amount, 'buy')}
                        className="grid grid-cols-3 gap-2 text-xs py-1 hover:bg-red-50 cursor-pointer rounded"
                      >
                        <span className="text-red-600 font-medium">{ask.price?.toFixed(6) || '0.000000'}</span>
                        <span className="text-gray-600">{ask.amount?.toFixed(2) || '0.00'}</span>
                        <span className="text-gray-500">{((ask.price || 0) * (ask.amount || 0)).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'trades' && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Trades</h4>
                <div className="space-y-1">
                  {recentTrades.slice(0, 15).map((trade, index) => (
                    <div key={index} className="grid grid-cols-3 gap-2 text-xs py-1">
                      <span className={`font-medium ${trade.side === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                        {trade.price?.toFixed(6) || '0.000000'}
                      </span>
                      <span className="text-gray-600">{trade.amount?.toFixed(2) || '0.00'}</span>
                      <span className="text-gray-500">{new Date(trade.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'chart' && (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={['auto', 'auto']} />
                    <Tooltip />
                    <Line type="monotone" dataKey="price" stroke="#2563eb" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Portfolio & Orders */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow-md">
          {/* Portfolio Summary */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Portfolio</h3>
            {portfolio && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">XRP Balance:</span>
                  <span className="font-medium">{parseFloat(portfolio.xrpBalance || 0).toFixed(6)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Token Balance:</span>
                  <span className="font-medium">
                    {portfolio.tokenBalances?.find(b => b.currency === selectedPair.split('/')[0])?.balance || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Value:</span>
                  <span className="font-medium">{portfolio.totalValue?.toFixed(2) || '0.00'} XRP</span>
                </div>
              </div>
            )}
          </div>

          {/* Open Orders */}
          <div className="p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Open Orders</h4>
            {openOrders.length === 0 ? (
              <p className="text-gray-500 text-sm">No open orders</p>
            ) : (
              <div className="space-y-2">
                {openOrders.map((order, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-xs font-medium">
                          <span className={`${order.side === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                            {order.side?.toUpperCase() || 'UNKNOWN'}
                          </span>
                          {' '}
                          <span className="text-gray-600">{order.type || 'unknown'}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.amount || '0'} @ {order.price || '0'}
                        </div>
                        {order.leverage && (
                          <div className="text-xs text-yellow-600">
                            Leverage: {order.leverage}x
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => cancelOrder(order.id)}
                        className="text-red-500 hover:text-red-700"
                        aria-label="Cancel Order"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(order.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Intercom Chat Widget */}
      <IntercomChat user={user} />
    </div>
  );
};

export default AdvancedTradingInterface;