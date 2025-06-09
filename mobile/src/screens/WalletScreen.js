import React, {useState, useContext, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
  Modal,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Clipboard,
} from 'react-native';
import {AuthContext} from '../utils/AuthContext';
import { styles as globalStyles, colors } from '../styles';
import { apiService } from '../services/ApiService';
import { webSocketService } from '../services/WebSocketService';
import { xummService } from '../services/XummService';
import { flareService } from '../services/FlareService';
import AuthService from '../services/AuthService';

const WalletScreen = () => {
  const {user} = useContext(AuthContext);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [sendAmount, setSendAmount] = useState('');
  const [sendAddress, setSendAddress] = useState('');
  const [sendMemo, setSendMemo] = useState('');
  
  // Data states
  const [walletBalance, setWalletBalance] = useState(null);
  const [tokenHoldings, setTokenHoldings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [walletSession, setWalletSession] = useState(null);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingTransaction, setSendingTransaction] = useState(false);
  
  // Connection states
  const [walletConnected, setWalletConnected] = useState(false);

  // Initialize component
  useEffect(() => {
    initializeWallet();
    setupWebSocketListeners();
    
    return () => {
      cleanupWebSocketListeners();
    };
  }, []);
  
  const initializeWallet = async () => {
    try {
      setLoading(true);
      
      await Promise.all([
        checkWalletConnection(),
        loadWalletBalance(),
        loadTokenHoldings(),
        loadTransactions(),
      ]);
    } catch (error) {
      console.error('Wallet initialization error:', error);
      Alert.alert('Error', 'Failed to initialize wallet data');
    } finally {
      setLoading(false);
    }
  };
  
  const checkWalletConnection = async () => {
    try {
      const hasSession = await xummService.hasActiveSession();
      setWalletConnected(hasSession);
      
      if (hasSession) {
        const session = xummService.getCurrentSession();
        setWalletSession(session);
        console.log('Wallet connected:', session?.account);
      }
    } catch (error) {
      console.error('Check wallet connection error:', error);
    }
  };
  
  const loadWalletBalance = async () => {
    try {
      const response = await apiService.getWalletBalance();
      if (response.success) {
        setWalletBalance(response.data);
      }
    } catch (error) {
      console.error('Load wallet balance error:', error);
    }
  };
  
  const loadTokenHoldings = async () => {
    try {
      const response = await flareService.getUserTokens();
      if (response.success) {
        setTokenHoldings(response.data);
      }
    } catch (error) {
      console.error('Load token holdings error:', error);
    }
  };
  
  const loadTransactions = async () => {
    try {
      const response = await apiService.getTransactions({ limit: 20 });
      if (response.success) {
        setTransactions(response.data);
      }
    } catch (error) {
      console.error('Load transactions error:', error);
    }
  };
  
  const setupWebSocketListeners = () => {
    webSocketService.addListener('balance_update', handleBalanceUpdate);
    webSocketService.addListener('transaction_update', handleTransactionUpdate);
    
    const currentUser = AuthService.getCurrentUser();
    if (currentUser) {
      webSocketService.subscribeToBalanceUpdates(currentUser.id);
      
      if (walletSession?.account) {
        webSocketService.subscribeToTransactionUpdates(walletSession.account);
      }
    }
  };
  
  const cleanupWebSocketListeners = () => {
    webSocketService.removeListener('balance_update', handleBalanceUpdate);
    webSocketService.removeListener('transaction_update', handleTransactionUpdate);
  };
  
  const handleBalanceUpdate = useCallback((data) => {
    setWalletBalance(prev => ({ ...prev, ...data }));
  }, []);
  
  const handleTransactionUpdate = useCallback((data) => {
    loadTransactions(); // Refresh transaction list
  }, []);
  
  const connectWallet = async () => {
    try {
      const result = await xummService.connectWallet();
      if (result.success) {
        setWalletConnected(true);
        setWalletSession(result.session);
        Alert.alert('Success', 'Wallet connected successfully!');
        await loadWalletBalance();
      } else {
        Alert.alert('Error', result.message || 'Failed to connect wallet');
      }
    } catch (error) {
      console.error('Connect wallet error:', error);
      Alert.alert('Error', 'Failed to connect wallet');
    }
  };
  
  const disconnectWallet = async () => {
    try {
      await xummService.disconnectWallet();
      setWalletConnected(false);
      setWalletSession(null);
      setWalletBalance(null);
      setTokenHoldings([]);
      setTransactions([]);
      Alert.alert('Success', 'Wallet disconnected');
    } catch (error) {
      console.error('Disconnect wallet error:', error);
      Alert.alert('Error', 'Failed to disconnect wallet');
    }
  };
  
  const handleSend = async () => {
    if (!walletConnected) {
      Alert.alert('Error', 'Please connect your wallet first');
      return;
    }

    if (!sendAmount || !sendAddress) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!xummService.isValidXRPAddress(sendAddress)) {
      Alert.alert('Error', 'Invalid XRP address');
      return;
    }

    if (parseFloat(sendAmount) <= 0) {
      Alert.alert('Error', 'Amount must be greater than 0');
      return;
    }

    if (walletBalance && parseFloat(sendAmount) > walletBalance.xrp) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    Alert.alert(
      'Confirm Transaction',
      `Send ${sendAmount} XRP to ${sendAddress}${sendMemo ? `\nMemo: ${sendMemo}` : ''}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Send', onPress: () => executeTransaction()}
      ]
    );
  };
  
  const executeTransaction = async () => {
    try {
      setSendingTransaction(true);
      
      const result = await xummService.sendXRPPayment(
        sendAddress,
        parseFloat(sendAmount),
        null, // destination tag
        sendMemo || null
      );
      
      if (result.success) {
        Alert.alert('Success', 'Transaction sent successfully!');
        
        // Reset form and close modal
        setShowSendModal(false);
        setSendAmount('');
        setSendAddress('');
        setSendMemo('');
        
        // Refresh data
        await Promise.all([
          loadWalletBalance(),
          loadTransactions(),
        ]);
      } else {
        Alert.alert('Error', result.message || 'Transaction failed');
      }
    } catch (error) {
      console.error('Execute transaction error:', error);
      Alert.alert('Error', 'Transaction failed');
    } finally {
      setSendingTransaction(false);
    }
  };
  
  const copyToClipboard = async (text) => {
    try {
      await Clipboard.setString(text);
      Alert.alert('Copied', 'Address copied to clipboard');
    } catch (error) {
      console.error('Copy to clipboard error:', error);
    }
  };
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await initializeWallet();
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
  
  const formatAddress = (address) => {
    if (!address) return 'Not connected';
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const renderTransaction = ({item}) => {
    const isIncoming = item.type === 'Received' || item.type === 'Dividend';
    const iconMap = {
      'Received': '↓',
      'Sent': '↑',
      'Token Purchase': '💎',
      'Dividend': '💰',
      'Trade': '🔄',
    };
    
    return (
      <TouchableOpacity 
        style={styles.transactionItem}
        onPress={() => {
          Alert.alert(
            'Transaction Details',
            `Type: ${item.type}\nAmount: ${item.amount} ${item.currency}\nStatus: ${item.status}\nTime: ${formatTimeAgo(item.timestamp || item.time)}${item.txHash ? `\nTx Hash: ${item.txHash}` : ''}`,
            [
              { text: 'OK' },
              item.txHash && { text: 'Copy Hash', onPress: () => copyToClipboard(item.txHash) },
            ].filter(Boolean)
          );
        }}>
        <View style={styles.transactionIcon}>
          <Text style={styles.transactionIconText}>
            {iconMap[item.type] || '💱'}
          </Text>
        </View>
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionType}>{item.type}</Text>
          <Text style={styles.transactionDescription}>
            {item.description || (item.type === 'Received' ? `From ${formatAddress(item.from)}` : `To ${formatAddress(item.to)}`)}
          </Text>
          <Text style={styles.transactionTime}>{formatTimeAgo(item.timestamp || item.time)}</Text>
        </View>
        <View style={styles.transactionAmount}>
          <Text style={[
            styles.transactionAmountText,
            isIncoming ? styles.positiveAmount : styles.negativeAmount
          ]}>
            {isIncoming ? '+' : '-'}{item.amount} {item.currency}
          </Text>
          <Text style={[
            styles.transactionStatus,
            item.status === 'Completed' ? styles.completedStatus : styles.pendingStatus
          ]}>
            {item.status}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTokenHolding = ({item}) => (
    <TouchableOpacity 
      style={styles.tokenItem}
      onPress={() => {
        Alert.alert(
          'Token Details',
          `Symbol: ${item.symbol}\nName: ${item.name}\nBalance: ${item.balance || item.amount} tokens\nValue: ${(item.value || 0).toFixed(4)} XRP\nContract: ${item.contractAddress || 'N/A'}`,
          [
            { text: 'OK' },
            item.contractAddress && { text: 'Copy Contract', onPress: () => copyToClipboard(item.contractAddress) },
          ].filter(Boolean)
        );
      }}>
      <View style={styles.tokenInfo}>
        <Text style={styles.tokenSymbol}>{item.symbol}</Text>
        <Text style={styles.tokenName}>{item.name}</Text>
        {item.contractAddress && (
          <Text style={styles.tokenContract}>{formatAddress(item.contractAddress)}</Text>
        )}
      </View>
      <View style={styles.tokenValue}>
        <Text style={styles.tokenAmount}>{item.balance || item.amount} tokens</Text>
        <Text style={styles.tokenValueText}>{(item.value || 0).toFixed(4)} XRP</Text>
        {item.change && (
          <Text style={[
            styles.tokenChange,
            item.change.startsWith('+') ? styles.positiveChange : styles.negativeChange
          ]}>
            {item.change}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={globalStyles.container}>
      <ScrollView 
        style={globalStyles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        <View style={styles.header}>
          <Text style={styles.title}>Wallet</Text>
          <Text style={styles.walletAddress}>
            {user?.address ? `${user.address.slice(0, 8)}...${user.address.slice(-6)}` : 'Not connected'}
          </Text>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceAmount}>{walletBalance.xrp.toFixed(2)} XRP</Text>
          <Text style={styles.balanceUSD}>${walletBalance.usd.toFixed(2)} USD</Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setShowSendModal(true)}>
              <Text style={styles.actionButtonText}>Send</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Receive</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Buy</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={globalStyles.tabContainer}>
          <TouchableOpacity
            style={[globalStyles.tab, selectedTab === 'overview' && globalStyles.activeTab]}
            onPress={() => setSelectedTab('overview')}>
            <Text style={[globalStyles.tabText, selectedTab === 'overview' && globalStyles.activeTabText]}>
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[globalStyles.tab, selectedTab === 'tokens' && globalStyles.activeTab]}
            onPress={() => setSelectedTab('tokens')}>
            <Text style={[globalStyles.tabText, selectedTab === 'tokens' && globalStyles.activeTabText]}>
              Tokens
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[globalStyles.tab, selectedTab === 'history' && globalStyles.activeTab]}
            onPress={() => setSelectedTab('history')}>
            <Text style={[globalStyles.tabText, selectedTab === 'history' && globalStyles.activeTabText]}>
              History
            </Text>
          </TouchableOpacity>
        </View>

        {selectedTab === 'overview' && (
          <View style={globalStyles.card}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>XRP Balance</Text>
                <Text style={styles.summaryValue}>{walletBalance.xrp.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Token Holdings</Text>
                <Text style={styles.summaryValue}>{tokenHoldings.length}</Text>
              </View>
            </View>
            
            <Text style={globalStyles.subtitle}>Recent Activity</Text>
            <FlatList
              data={transactions.slice(0, 3)}
              renderItem={renderTransaction}
              keyExtractor={item => item.id.toString()}
              scrollEnabled={false}
            />
          </View>
        )}

        {selectedTab === 'tokens' && (
          <View style={globalStyles.card}>
            <Text style={globalStyles.subtitle}>Property Tokens</Text>
            <FlatList
              data={tokenHoldings}
              renderItem={renderTokenHolding}
              keyExtractor={item => item.id.toString()}
              scrollEnabled={false}
            />
          </View>
        )}

        {selectedTab === 'history' && (
          <View style={globalStyles.card}>
            <Text style={globalStyles.subtitle}>Transaction History</Text>
            <FlatList
              data={transactions}
              renderItem={renderTransaction}
              keyExtractor={item => item.id.toString()}
              scrollEnabled={false}
            />
          </View>
        )}

        <Modal
          visible={showSendModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowSendModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Send XRP</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Recipient Address</Text>
                <TextInput
                  style={styles.input}
                  value={sendAddress}
                  onChangeText={setSendAddress}
                  placeholder="Enter XRPL address"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Amount (XRP)</Text>
                <TextInput
                  style={styles.input}
                  value={sendAmount}
                  onChangeText={setSendAmount}
                  placeholder="0.00"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.availableBalance}>
                  Available: {walletBalance.xrp.toFixed(2)} XRP
                </Text>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowSendModal(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.sendButton]}
                  onPress={handleSend}>
                  <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  walletAddress: {
    fontSize: 14,
    color: colors.accent,
    fontFamily: 'monospace',
  },
  balanceCard: {
    backgroundColor: colors.secondary,
    marginHorizontal: 16,
    marginVertical: 20,
    padding: 25,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  balanceUSD: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: 25,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  actionButton: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  actionButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 25,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    backgroundColor: colors.primary,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  transactionIconText: {
    fontSize: 18,
    color: colors.accent,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 3,
  },
  transactionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  transactionTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  positiveAmount: {
    color: colors.positive,
  },
  negativeAmount: {
    color: colors.negative,
  },
  transactionStatus: {
    fontSize: 12,
    color: colors.positive,
  },
  tokenItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 3,
  },
  tokenName: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  tokenValue: {
    alignItems: 'flex-end',
  },
  tokenAmount: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  tokenValueText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 3,
  },
  tokenChange: {
    fontSize: 12,
    fontWeight: '600',
  },
  positiveChange: {
    color: colors.positive,
  },
  negativeChange: {
    color: colors.negative,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.secondary,
    margin: 20,
    padding: 25,
    borderRadius: 20,
    width: '90%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
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
  availableBalance: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 5,
    textAlign: 'right',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    backgroundColor: colors.accent,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  sendButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WalletScreen;