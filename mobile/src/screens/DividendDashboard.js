// ============================================================================
// DIVIDEND DASHBOARD - Cross-Chain Dividend Management
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions
} from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../utils/AuthContext';
import { dividendService } from '../services/DividendService';

const { width: screenWidth } = Dimensions.get('window');

const DividendDashboard = ({ navigation }) => {
  const { user } = useAuth();
  const [dividendSummary, setDividendSummary] = useState(null);
  const [claimableDividends, setClaimableDividends] = useState([]);
  const [dividendHistory, setDividendHistory] = useState([]);
  const [cityPoolDividends, setCityPoolDividends] = useState([]);
  const [stakingRewards, setStakingRewards] = useState([]);
  const [propxDividends, setPropxDividends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDividendData();
  }, []);

  const fetchDividendData = async () => {
    try {
      setLoading(true);
      
      const [summary, claimable, history, cityPools, staking, propx] = await Promise.all([
        dividendService.getUserDividendSummary(user.address),
        dividendService.getClaimableDividends(user.address),
        dividendService.getDividendHistory(user.address),
        dividendService.getCityPoolDividends(user.address),
        dividendService.getStakingRewards(user.address),
        dividendService.getPROPXDividends(user.address)
      ]);

      setDividendSummary(summary);
      setClaimableDividends(claimable);
      setDividendHistory(history);
      setCityPoolDividends(cityPools);
      setStakingRewards(staking);
      setPropxDividends(propx);
    } catch (error) {
      console.error('Error fetching dividend data:', error);
      Alert.alert('Error', 'Failed to load dividend data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDividendData();
  };

  const handleClaimDividend = async (roundId) => {
    try {
      const result = await dividendService.claimDividend(roundId);
      
      if (result.success) {
        Alert.alert('Success', 'Dividend claimed successfully!');
        fetchDividendData(); // Refresh data
      } else {
        Alert.alert('Error', result.error || 'Failed to claim dividend');
      }
    } catch (error) {
      console.error('Error claiming dividend:', error);
      Alert.alert('Error', 'Failed to claim dividend');
    }
  };

  const handleClaimAll = async () => {
    try {
      const roundIds = claimableDividends.map(d => d.roundId);
      const result = await dividendService.claimMultipleDividends(roundIds);
      
      if (result.success) {
        Alert.alert('Success', `Claimed ${roundIds.length} dividends successfully!`);
        fetchDividendData();
      } else {
        Alert.alert('Error', result.error || 'Failed to claim dividends');
      }
    } catch (error) {
      console.error('Error claiming all dividends:', error);
      Alert.alert('Error', 'Failed to claim dividends');
    }
  };

  const getDividendTypeIcon = (type) => {
    switch (type) {
      case 'XERA_CITY_POOL': return 'location-city';
      case 'XERA_STAKING_REWARD': return 'savings';
      case 'PROPX_RENTAL_INCOME': return 'home';
      case 'PROPX_CAPITAL_APPRECIATION': return 'trending-up';
      case 'CROSS_CHAIN_BONUS': return 'link';
      default: return 'account-balance-wallet';
    }
  };

  const getDividendTypeColor = (type) => {
    switch (type) {
      case 'XERA_CITY_POOL': return '#8B5CF6';
      case 'XERA_STAKING_REWARD': return '#10B981';
      case 'PROPX_RENTAL_INCOME': return '#06B6D4';
      case 'PROPX_CAPITAL_APPRECIATION': return '#F59E0B';
      case 'CROSS_CHAIN_BONUS': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const formatDividendType = (type) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
  };

  const dividendHistoryData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: dividendHistory.slice(-6).map(d => d.amount / 1000) || [0, 0, 0, 0, 0, 0],
        color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const dividendDistributionData = [
    {
      name: 'XERA Pools',
      population: (dividendSummary?.typeBreakdown?.xeraPools || 0),
      color: '#8B5CF6',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: 'Staking',
      population: (dividendSummary?.typeBreakdown?.staking || 0),
      color: '#10B981',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: 'PROPX',
      population: (dividendSummary?.typeBreakdown?.propx || 0),
      color: '#06B6D4',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: 'Bonuses',
      population: (dividendSummary?.typeBreakdown?.bonuses || 0),
      color: '#F59E0B',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
  ];

  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Summary Cards */}
      <View style={styles.summaryCards}>
        <View style={[styles.summaryCard, styles.totalEarnedCard]}>
          <Icon name="account-balance-wallet" size={24} color="white" />
          <Text style={styles.summaryLabel}>Total Earned</Text>
          <Text style={styles.summaryValue}>₹{(dividendSummary?.totalEarned || 0).toLocaleString()}</Text>
          <Text style={styles.summaryChange}>+{dividendSummary?.monthlyGrowth || 0}% this month</Text>
        </View>
        
        <View style={[styles.summaryCard, styles.pendingCard]}>
          <Icon name="pending" size={24} color="white" />
          <Text style={styles.summaryLabel}>Pending Claims</Text>
          <Text style={styles.summaryValue}>₹{(dividendSummary?.pendingAmount || 0).toLocaleString()}</Text>
          <Text style={styles.summarySubtext}>{claimableDividends.length} rounds</Text>
        </View>
      </View>

      <View style={styles.summaryCards}>
        <View style={[styles.summaryCard, styles.monthlyCard]}>
          <Icon name="calendar-today" size={24} color="white" />
          <Text style={styles.summaryLabel}>This Month</Text>
          <Text style={styles.summaryValue}>₹{(dividendSummary?.thisMonth || 0).toLocaleString()}</Text>
          <Text style={styles.summarySubtext}>from {dividendSummary?.activeStreams || 0} streams</Text>
        </View>
        
        <View style={[styles.summaryCard, styles.yieldCard]}>
          <Icon name="trending-up" size={24} color="white" />
          <Text style={styles.summaryLabel}>Avg Monthly Yield</Text>
          <Text style={styles.summaryValue}>{dividendSummary?.averageYield || 0}%</Text>
          <Text style={styles.summarySubtext}>annualized</Text>
        </View>
      </View>

      {/* Dividend History Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>6-Month Dividend History</Text>
        <LineChart
          data={dividendHistoryData}
          width={screenWidth - 60}
          height={200}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      </View>

      {/* Distribution Pie Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Dividend Sources</Text>
        <PieChart
          data={dividendDistributionData}
          width={screenWidth - 60}
          height={200}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      </View>

      {/* Quick Actions */}
      {claimableDividends.length > 0 && (
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity style={styles.claimAllButton} onPress={handleClaimAll}>
            <Icon name="account-balance-wallet" size={20} color="white" />
            <Text style={styles.claimAllText}>
              Claim All ({claimableDividends.length}) - ₹{claimableDividends.reduce((sum, d) => sum + d.amount, 0).toLocaleString()}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  const renderClaimableTab = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Claimable Dividends</Text>
      
      {claimableDividends.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="account-balance-wallet" size={48} color="#d1d5db" />
          <Text style={styles.emptyStateText}>No claimable dividends</Text>
          <Text style={styles.emptyStateSubtext}>Your dividends will appear here when available</Text>
        </View>
      ) : (
        claimableDividends.map((dividend, index) => (
          <View key={index} style={styles.dividendCard}>
            <View style={styles.dividendHeader}>
              <View style={styles.dividendTypeInfo}>
                <View style={[
                  styles.dividendTypeIcon,
                  { backgroundColor: getDividendTypeColor(dividend.type) }
                ]}>
                  <Icon 
                    name={getDividendTypeIcon(dividend.type)} 
                    size={16} 
                    color="white" 
                  />
                </View>
                <View>
                  <Text style={styles.dividendType}>
                    {formatDividendType(dividend.type)}
                  </Text>
                  <Text style={styles.dividendSource}>{dividend.source}</Text>
                </View>
              </View>
              <View style={styles.dividendAmount}>
                <Text style={styles.dividendValue}>₹{dividend.amount.toLocaleString()}</Text>
                <Text style={styles.dividendDate}>
                  Expires: {new Date(dividend.deadline).toLocaleDateString()}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.claimButton}
              onPress={() => handleClaimDividend(dividend.roundId)}
            >
              <Icon name="account-balance-wallet" size={16} color="white" />
              <Text style={styles.claimButtonText}>Claim Now</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderHistoryTab = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Dividend History</Text>
      
      {dividendHistory.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="history" size={48} color="#d1d5db" />
          <Text style={styles.emptyStateText}>No dividend history</Text>
          <Text style={styles.emptyStateSubtext}>Your claimed dividends will appear here</Text>
        </View>
      ) : (
        dividendHistory.map((dividend, index) => (
          <View key={index} style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <View style={styles.historyTypeInfo}>
                <View style={[
                  styles.historyTypeIcon,
                  { backgroundColor: getDividendTypeColor(dividend.type) }
                ]}>
                  <Icon 
                    name={getDividendTypeIcon(dividend.type)} 
                    size={16} 
                    color="white" 
                  />
                </View>
                <View>
                  <Text style={styles.historyType}>
                    {formatDividendType(dividend.type)}
                  </Text>
                  <Text style={styles.historySource}>{dividend.source}</Text>
                </View>
              </View>
              <View style={styles.historyAmount}>
                <Text style={styles.historyValue}>₹{dividend.amount.toLocaleString()}</Text>
                <Text style={styles.historyDate}>
                  {new Date(dividend.claimedAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
            
            {dividend.transactionHash && (
              <TouchableOpacity style={styles.txHashButton}>
                <Icon name="link" size={14} color="#8B5CF6" />
                <Text style={styles.txHashText}>
                  {dividend.transactionHash.slice(0, 12)}...
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderStreamsTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* XERA City Pools */}
      <View style={styles.streamSection}>
        <Text style={styles.streamSectionTitle}>XERA City Pool Dividends</Text>
        {cityPoolDividends.map((pool, index) => (
          <View key={index} style={styles.streamCard}>
            <View style={styles.streamHeader}>
              <View style={styles.streamInfo}>
                <Icon name="location-city" size={20} color="#8B5CF6" />
                <Text style={styles.streamName}>{pool.cityName}</Text>
              </View>
              <Text style={styles.streamYield}>{pool.yield}% APY</Text>
            </View>
            <View style={styles.streamStats}>
              <View style={styles.streamStat}>
                <Text style={styles.streamStatLabel}>Monthly Income</Text>
                <Text style={styles.streamStatValue}>₹{pool.monthlyIncome.toLocaleString()}</Text>
              </View>
              <View style={styles.streamStat}>
                <Text style={styles.streamStatLabel}>Your Share</Text>
                <Text style={styles.streamStatValue}>₹{pool.yourShare.toLocaleString()}</Text>
              </View>
              <View style={styles.streamStat}>
                <Text style={styles.streamStatLabel}>Properties</Text>
                <Text style={styles.streamStatValue}>{pool.propertyCount}</Text>
              </View>
            </View>
            <View style={styles.streamProgress}>
              <Text style={styles.streamProgressLabel}>
                Occupancy: {pool.occupancyRate}%
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[styles.progressFill, { width: `${pool.occupancyRate}%` }]} 
                />
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Staking Rewards */}
      <View style={styles.streamSection}>
        <Text style={styles.streamSectionTitle}>XERA Staking Rewards</Text>
        {stakingRewards.map((stake, index) => (
          <View key={index} style={styles.streamCard}>
            <View style={styles.streamHeader}>
              <View style={styles.streamInfo}>
                <Icon name="savings" size={20} color="#10B981" />
                <Text style={styles.streamName}>
                  {stake.tier} Staking ({stake.duration} days)
                </Text>
              </View>
              <Text style={styles.streamYield}>{stake.apy}% APY</Text>
            </View>
            <View style={styles.streamStats}>
              <View style={styles.streamStat}>
                <Text style={styles.streamStatLabel}>Staked Amount</Text>
                <Text style={styles.streamStatValue}>{stake.stakedAmount.toLocaleString()} XERA</Text>
              </View>
              <View style={styles.streamStat}>
                <Text style={styles.streamStatLabel}>Earned Rewards</Text>
                <Text style={styles.streamStatValue}>{stake.earnedRewards.toLocaleString()} XERA</Text>
              </View>
              <View style={styles.streamStat}>
                <Text style={styles.streamStatLabel}>Est. Monthly</Text>
                <Text style={styles.streamStatValue}>₹{stake.estimatedMonthly.toLocaleString()}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* PROPX Property Dividends */}
      <View style={styles.streamSection}>
        <Text style={styles.streamSectionTitle}>PROPX Property Dividends</Text>
        {propxDividends.map((propx, index) => (
          <View key={index} style={styles.streamCard}>
            <View style={styles.streamHeader}>
              <View style={styles.streamInfo}>
                <Icon name="business" size={20} color="#06B6D4" />
                <Text style={styles.streamName}>{propx.propertyName}</Text>
              </View>
              <Text style={styles.streamYield}>{propx.yield}% APY</Text>
            </View>
            <View style={styles.streamStats}>
              <View style={styles.streamStat}>
                <Text style={styles.streamStatLabel}>Your Investment</Text>
                <Text style={styles.streamStatValue}>₹{propx.investment.toLocaleString()}</Text>
              </View>
              <View style={styles.streamStat}>
                <Text style={styles.streamStatLabel}>Tokens Owned</Text>
                <Text style={styles.streamStatValue}>{propx.tokensOwned}</Text>
              </View>
              <View style={styles.streamStat}>
                <Text style={styles.streamStatLabel}>Total Dividends</Text>
                <Text style={styles.streamStatValue}>₹{propx.totalDividends.toLocaleString()}</Text>
              </View>
            </View>
            <View style={styles.streamProgress}>
              <Text style={styles.streamProgressLabel}>
                Property Progress: {propx.completionProgress}%
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[styles.progressFill, { width: `${propx.completionProgress}%` }]} 
                />
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Icon name="account-balance-wallet" size={40} color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading Dividends...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dividend Dashboard</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Icon name="refresh" size={24} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'claimable' && styles.activeTab]}
          onPress={() => setActiveTab('claimable')}
        >
          <Text style={[styles.tabText, activeTab === 'claimable' && styles.activeTabText]}>
            Claimable ({claimableDividends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            History
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'streams' && styles.activeTab]}
          onPress={() => setActiveTab('streams')}
        >
          <Text style={[styles.tabText, activeTab === 'streams' && styles.activeTabText]}>
            Streams
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.contentContainer}>
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'claimable' && renderClaimableTab()}
        {activeTab === 'history' && renderHistoryTab()}
        {activeTab === 'streams' && renderStreamsTab()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#8B5CF6',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  summaryCard: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    minHeight: 120,
  },
  totalEarnedCard: {
    backgroundColor: '#8B5CF6',
  },
  pendingCard: {
    backgroundColor: '#F59E0B',
  },
  monthlyCard: {
    backgroundColor: '#10B981',
  },
  yieldCard: {
    backgroundColor: '#06B6D4',
  },
  summaryLabel: {
    color: 'white',
    fontSize: 12,
    marginTop: 8,
    opacity: 0.9,
  },
  summaryValue: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 5,
  },
  summaryChange: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
    opacity: 0.9,
  },
  summarySubtext: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
    opacity: 0.9,
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#1a1a1a',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  quickActions: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#1a1a1a',
  },
  claimAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    padding: 15,
    borderRadius: 12,
  },
  claimAllText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#d1d5db',
    marginTop: 5,
    textAlign: 'center',
  },
  dividendCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dividendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  dividendTypeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividendTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dividendType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  dividendSource: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  dividendAmount: {
    alignItems: 'flex-end',
  },
  dividendValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  dividendDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    padding: 12,
    borderRadius: 8,
  },
  claimButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  historyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyTypeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyTypeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  historyType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  historySource: {
    fontSize: 12,
    color: '#666',
    marginTop: 1,
  },
  historyAmount: {
    alignItems: 'flex-end',
  },
  historyValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  historyDate: {
    fontSize: 11,
    color: '#666',
    marginTop: 1,
  },
  txHashButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  txHashText: {
    fontSize: 12,
    color: '#8B5CF6',
    marginLeft: 4,
  },
  streamSection: {
    marginBottom: 25,
  },
  streamSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 15,
  },
  streamCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  streamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  streamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streamName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 10,
  },
  streamYield: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10B981',
  },
  streamStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  streamStat: {
    alignItems: 'center',
  },
  streamStatLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  streamStatValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  streamProgress: {
    marginTop: 10,
  },
  streamProgressLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 2,
  },
});

export default DividendDashboard;