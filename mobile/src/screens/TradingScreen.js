import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { styles as globalStyles, colors } from '../styles';
import { apiService } from '../services/ApiService';
import { webSocketService } from '../services/WebSocketService';
import { xummService } from '../services/XummService';
import { flareService } from '../services/FlareService';
import AuthService from '../services/AuthService';

const TradingScreen = () => {
  const [selectedTab, setSelectedTab] = useState('buy');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [amount, setAmount] = useState('');
  const [orderType, setOrderType] = useState('market');
  const [price, setPrice] = useState('');
  
  // Data states
  const [tradingPairs, setTradingPairs] = useState([]);
  const [marketData, setMarketData] = useState({});
  const [orderHistory, setOrderHistory] = useState([]);
  const [recentTrades, setRecentTrades] = useState([]);
  const [userBalance, setUserBalance] = useState(null);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Connection states
  const [isConnected, setIsConnected] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);

  // Initialize component
  useEffect(() => {
    initializeTrading();
    setupWebSocketListeners();
    
    return () => {
      cleanupWebSocketListeners();
    };
  }, []);
  
  // Check wallet connection on mount
  useEffect(() => {
    checkWalletConnection();
  }, []);
  
  const initializeTrading = async () => {
    try {
      setLoading(true);
      
      await Promise.all([
        loadTradingPairs(),
        loadOrderHistory(),
        loadRecentTrades(),
        loadUserBalance(),
      ]);
    } catch (error) {
      console.error('Trading initialization error:', error);
      Alert.alert('Error', 'Failed to initialize trading data');
    } finally {
      setLoading(false);
    }
  };
  
  const loadTradingPairs = async () => {
    try {
      const response = await apiService.getTradingPairs();
      if (response.success) {
        setTradingPairs(response.data);
        
        // Load market data for each pair
        const marketDataPromises = response.data.map(pair => 
          loadMarketData(pair.symbol)
        );
        await Promise.all(marketDataPromises);
      }
    } catch (error) {
      console.error('Load trading pairs error:', error);
    }
  };
  
  const loadMarketData = async (symbol) => {
    try {
      const response = await apiService.getMarketData(symbol);
      if (response.success) {
        setMarketData(prev => ({
          ...prev,
          [symbol]: response.data,
        }));
      }
    } catch (error) {
      console.error('Load market data error:', error);
    }
  };
  
  const loadOrderHistory = async () => {
    try {
      const response = await apiService.getOrderHistory({ limit: 10 });
      if (response.success) {
        setOrderHistory(response.data);
      }
    } catch (error) {
      console.error('Load order history error:', error);
    }
  };
  
  const loadRecentTrades = async () => {
    try {
      // Get recent trades from API or WebSocket
      setRecentTrades([
        {
          id: Date.now() + 1,
          symbol: 'LUXC001',
          type: 'Buy',
          amount: 100,
          price: 50.2,
          time: new Date(Date.now() - 120000).toISOString(),
        },
        {
          id: Date.now() + 2,
          symbol: 'OFFC002',
          type: 'Sell',
          amount: 250,
          price: 126.0,
          time: new Date(Date.now() - 300000).toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Load recent trades error:', error);
    }
  };
  
  const loadUserBalance = async () => {
    try {
      const response = await apiService.getWalletBalance();
      if (response.success) {
        setUserBalance(response.data);
      }
    } catch (error) {
      console.error('Load user balance error:', error);
    }
  };
  
  const checkWalletConnection = async () => {
    try {
      const hasSession = await xummService.hasActiveSession();
      setWalletConnected(hasSession);
      
      if (hasSession) {
        const session = xummService.getCurrentSession();
        console.log('Wallet connected:', session?.account);
      }
    } catch (error) {
      console.error('Check wallet connection error:', error);
    }
  };
  
  const setupWebSocketListeners = () => {
    webSocketService.addListener('price_update', handlePriceUpdate);
    webSocketService.addListener('order_update', handleOrderUpdate);
    webSocketService.addListener('balance_update', handleBalanceUpdate);
    
    // Subscribe to relevant channels
    if (tradingPairs.length > 0) {
      tradingPairs.forEach(pair => {
        webSocketService.subscribeToPriceUpdates([pair.symbol]);
      });
    }
    
    const currentUser = AuthService.getCurrentUser();
    if (currentUser) {
      webSocketService.subscribeToOrderUpdates(currentUser.id);
      webSocketService.subscribeToBalanceUpdates(currentUser.id);
    }
  };
  
  const cleanupWebSocketListeners = () => {
    webSocketService.removeListener('price_update', handlePriceUpdate);
    webSocketService.removeListener('order_update', handleOrderUpdate);
    webSocketService.removeListener('balance_update', handleBalanceUpdate);
  };
  
  const handlePriceUpdate = useCallback((data) => {
    setMarketData(prev => ({
      ...prev,
      [data.symbol]: {
        ...prev[data.symbol],
        ...data,
      },
    }));
  }, []);
  
  const handleOrderUpdate = useCallback((data) => {
    loadOrderHistory(); // Refresh order history
  }, []);
  
  const handleBalanceUpdate = useCallback((data) => {
    setUserBalance(prev => ({ ...prev, ...data }));
  }, []);
  
  const connectWallet = async () => {
    try {
      const result = await xummService.connectWallet();
      if (result.success) {
        setWalletConnected(true);
        Alert.alert('Success', 'Wallet connected successfully!');
        await loadUserBalance();
      } else {
        Alert.alert('Error', result.message || 'Failed to connect wallet');
      }
    } catch (error) {
      console.error('Connect wallet error:', error);
      Alert.alert('Error', 'Failed to connect wallet');
    }
  };
  
  const handleTrade = async () => {
    if (!walletConnected) {
      Alert.alert('Error', 'Please connect your wallet first', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Connect', onPress: connectWallet },
      ]);
      return;
    }

    if (!selectedProperty) {
      Alert.alert('Error', 'Please select a property token');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (orderType === 'limit' && (!price || parseFloat(price) <= 0)) {
      Alert.alert('Error', 'Please enter a valid price for limit order');
      return;
    }

    const currentMarketData = marketData[selectedProperty.symbol];
    const tradePrice = orderType === 'market' 
      ? currentMarketData?.price || selectedProperty.price
      : parseFloat(price);
    
    const total = (parseFloat(amount) * tradePrice).toFixed(2);
    
    // Check balance
    if (selectedTab === 'buy' && userBalance && parseFloat(total) > userBalance.xrp) {
      Alert.alert('Error', 'Insufficient XRP balance');
      return;
    }

    Alert.alert(
      'Confirm Trade',
      `${selectedTab.toUpperCase()}: ${amount} ${selectedProperty.symbol} tokens\nPrice: ${tradePrice} XRP\nTotal: ${total} XRP`,
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Confirm', onPress: () => executeOrder({
          symbol: selectedProperty.symbol,
          side: selectedTab,
          amount: parseFloat(amount),
          type: orderType,
          price: orderType === 'limit' ? parseFloat(price) : null,
        })}
      ]
    );
  };
  
  const executeOrder = async (orderData) => {
    try {
      setSubmittingOrder(true);
      
      const response = await apiService.placeOrder(orderData);
      
      if (response.success) {
        Alert.alert('Success', 'Order placed successfully!');
        
        // Reset form
        setAmount('');
        setPrice('');
        setSelectedProperty(null);
        
        // Refresh data
        await Promise.all([
          loadOrderHistory(),
          loadUserBalance(),
          loadRecentTrades(),
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to place order');
      }
    } catch (error) {
      console.error('Execute order error:', error);
      Alert.alert('Error', 'Failed to place order');
    } finally {
      setSubmittingOrder(false);
    }
  };
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await initializeTrading();
    setRefreshing(false);
  }, []);
  
  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const renderTokenItem = ({item}) => {
    const market = marketData[item.symbol] || {};
    const currentPrice = market.price || item.price || 0;
    const change = market.change || item.change || '0%';
    const volume = market.volume || item.volume || '0';
    
    return (
      <TouchableOpacity
        style={[
          styles.tokenItem,
          selectedProperty?.id === item.id && styles.selectedToken
        ]}
        onPress={() => setSelectedProperty(item)}>
        <View style={styles.tokenHeader}>
          <Text style={styles.tokenSymbol}>{item.symbol}</Text>
          <Text style={[
            styles.tokenChange,
            change.startsWith('+') ? styles.positiveChange : styles.negativeChange
          ]}>
            {change}
          </Text>
        </View>
        <Text style={styles.tokenName}>{item.name}</Text>
        <View style={styles.tokenDetails}>
          <Text style={styles.tokenPrice}>{currentPrice.toFixed(4)} XRP</Text>
          <Text style={styles.tokenVolume}>Vol: {volume}</Text>
        </View>
        <Text style={styles.availableTokens}>Available: {item.totalSupply || 'N/A'}</Text>
        {market.lastUpdated && (
          <Text style={styles.lastUpdated}>Updated: {formatTimeAgo(market.lastUpdated)}</Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderTradeItem = ({item}) => (
    <View style={styles.tradeItem}>
      <View style={styles.tradeHeader}>
        <Text style={styles.tradeSymbol}>{item.symbol}</Text>
        <Text style={[
          styles.tradeType,
          item.type === 'Buy' ? styles.buyType : styles.sellType
        ]}>
          {item.type}
        </Text>
      </View>
      <Text style={styles.tradeDetails}>
        {item.amount} tokens @ {item.price} XRP
      </Text>
      <Text style={styles.tradeTime}>{formatTimeAgo(item.time)}</Text>
      {item.status && (
        <Text style={[
          styles.tradeStatus,
          item.status === 'completed' ? styles.completedStatus : styles.pendingStatus
        ]}>
          {item.status.toUpperCase()}
        </Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={globalStyles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading trading data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={globalStyles.container}>
      <ScrollView 
        style={globalStyles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.title}>Trading</Text>
            <View style={styles.connectionStatus}>
              <View style={[
                styles.statusDot,
                walletConnected ? styles.connectedDot : styles.disconnectedDot
              ]} />
              <Text style={styles.statusText}>
                {walletConnected ? 'Wallet Connected' : 'Wallet Disconnected'}
              </Text>
            </View>
          </View>
          
          {!walletConnected && (
            <TouchableOpacity style={styles.connectButton} onPress={connectWallet}>
              <Text style={styles.connectButtonText}>Connect Wallet</Text>
            </TouchableOpacity>
          )}
          
          {userBalance && (
            <View style={styles.balanceContainer}>
              <Text style={styles.balanceLabel}>Available Balance:</Text>
              <Text style={styles.balanceValue}>{userBalance.xrp?.toFixed(4) || '0.0000'} XRP</Text>
            </View>
          )}
          
          {/* Chart Placeholder */}
          <View style={globalStyles.chartPlaceholder}>
            <Text style={globalStyles.chartPlaceholderText}>📈</Text>
            <Text style={globalStyles.chartPlaceholderText}>Live Chart Coming Soon</Text>
            <Text style={[globalStyles.mutedText, {marginTop: 4}]}>Real-time XRPL price feeds</Text>
          </View>
          
          <View style={globalStyles.tabContainer}>
            <TouchableOpacity
              style={[globalStyles.tab, selectedTab === 'buy' && globalStyles.activeTab]}
              onPress={() => setSelectedTab('buy')}>
              <Text style={[globalStyles.tabText, selectedTab === 'buy' && globalStyles.activeTabText]}>
                Buy
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[globalStyles.tab, selectedTab === 'sell' && globalStyles.activeTab]}
              onPress={() => setSelectedTab('sell')}>
              <Text style={[globalStyles.tabText, selectedTab === 'sell' && globalStyles.activeTabText]}>
                Sell
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={globalStyles.card}>
          <Text style={globalStyles.subtitle}>Available Tokens</Text>
          {tradingPairs.length > 0 ? (
            <FlatList
              data={tradingPairs}
              renderItem={renderTokenItem}
              keyExtractor={item => item.id?.toString() || item.symbol}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No trading pairs available</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadTradingPairs}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {selectedProperty && (
          <View style={styles.tradingPanel}>
            <Text style={globalStyles.subtitle}>
              {selectedTab === 'buy' ? 'Buy' : 'Sell'} {selectedProperty.symbol}
            </Text>
            
            <View style={styles.orderTypeContainer}>
              <TouchableOpacity
                style={[styles.orderTypeBtn, orderType === 'market' && styles.activeOrderType]}
                onPress={() => setOrderType('market')}>
                <Text style={[styles.orderTypeText, orderType === 'market' && styles.activeOrderTypeText]}>
                  Market
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.orderTypeBtn, orderType === 'limit' && styles.activeOrderType]}
                onPress={() => setOrderType('limit')}>
                <Text style={[styles.orderTypeText, orderType === 'limit' && styles.activeOrderTypeText]}>
                  Limit
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount (tokens)</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="Enter amount"
                keyboardType="numeric"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {orderType === 'limit' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Price (XRP per token)</Text>
                <TextInput
                  style={styles.input}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="Enter price"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            )}

            <View style={styles.tradeSummary}>
              <Text style={styles.summaryLabel}>Current Price:</Text>
              <Text style={styles.summaryValue}>{selectedProperty.price} XRP</Text>
            </View>

            {amount && (
              <View style={styles.tradeSummary}>
                <Text style={styles.summaryLabel}>Total:</Text>
                <Text style={styles.summaryValue}>
                  {orderType === 'market' 
                    ? (parseFloat(amount) * selectedProperty.price).toFixed(2)
                    : price ? (parseFloat(amount) * parseFloat(price)).toFixed(2) : '0'
                  } XRP
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.tradeButton,
                selectedTab === 'buy' ? styles.buyButton : styles.sellButton,
                submittingOrder && styles.disabledButton
              ]}
              onPress={handleTrade}
              disabled={submittingOrder}>
              {submittingOrder ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Text style={styles.tradeButtonText}>
                  {selectedTab === 'buy' ? 'Buy Tokens' : 'Sell Tokens'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={globalStyles.card}>
          <Text style={globalStyles.subtitle}>Recent Trades</Text>
          <FlatList
            data={recentTrades}
            renderItem={renderTradeItem}
            keyExtractor={item => item.id.toString()}
            scrollEnabled={false}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectedDot: {
    backgroundColor: colors.positive,
  },
  disconnectedDot: {
    backgroundColor: colors.negative,
  },
  statusText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  connectButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'center',
    marginBottom: 15,
  },
  connectButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.accent,
  },
  tokenItem: {
    backgroundColor: colors.secondary,
    padding: 15,
    borderRadius: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedToken: {
    borderColor: colors.accent,
    backgroundColor: colors.secondary,
  },
  tokenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  tokenSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  tokenChange: {
    fontSize: 14,
    fontWeight: '600',
  },
  positiveChange: {
    color: colors.positive,
  },
  negativeChange: {
    color: colors.negative,
  },
  tokenName: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  tokenDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  tokenPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.accent,
  },
  tokenVolume: {
    fontSize: 12,
    color: colors.textMuted,
  },
  availableTokens: {
    fontSize: 12,
    color: colors.textMuted,
  },
  lastUpdated: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 15,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  tradingPanel: {
    backgroundColor: colors.secondary,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderTypeContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 4,
  },
  orderTypeBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 4,
    borderRadius: 6,
  },
  activeOrderType: {
    backgroundColor: colors.accent,
  },
  orderTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  activeOrderTypeText: {
    color: colors.text,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: colors.primary,
    color: colors.text,
  },
  tradeSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  tradeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buyButton: {
    backgroundColor: colors.positive,
  },
  sellButton: {
    backgroundColor: colors.negative,
  },
  tradeButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  tradeItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  tradeSymbol: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  tradeType: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  buyType: {
    backgroundColor: colors.positive,
    color: colors.text,
  },
  sellType: {
    backgroundColor: colors.negative,
    color: colors.text,
  },
  tradeDetails: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  tradeTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  tradeStatus: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    alignSelf: 'flex-start',
  },
  completedStatus: {
    backgroundColor: colors.positive,
    color: colors.text,
  },
  pendingStatus: {
    backgroundColor: colors.warning || colors.accent,
    color: colors.text,
  },
});

export default TradingScreen;