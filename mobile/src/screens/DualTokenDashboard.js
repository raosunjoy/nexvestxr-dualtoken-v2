// ============================================================================
// DUAL TOKEN MOBILE DASHBOARD - XERA & PROPX UNIFIED VIEW
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../utils/AuthContext';
import { dualTokenService } from '../services/DualTokenService';

const { width: screenWidth } = Dimensions.get('window');

const DualTokenDashboard = ({ navigation }) => {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState(null);
  const [benefits, setBenefits] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [portfolioData, benefitsData, analyticsData] = await Promise.all([
        dualTokenService.getUserPortfolio(user.address),
        dualTokenService.getCrossChainBenefits(user.address),
        dualTokenService.getPlatformAnalytics()
      ]);

      setPortfolio(portfolioData);
      setBenefits(benefitsData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading && !portfolio) {
    return (
      <View style={styles.loadingContainer}>
        <Icon name="cached" size={40} color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading Portfolio...</Text>
      </View>
    );
  }

  const portfolioData = [
    {
      name: 'XERA',
      population: portfolio?.xera?.balance || 0,
      color: '#8B5CF6',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: 'PROPX',
      population: portfolio?.propx?.totalValue || 0,
      color: '#06B6D4',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
  ];

  const performanceData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: [850, 920, 880, 1100, 1250, 1180],
        color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
        strokeWidth: 2,
      },
    ],
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
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#8B5CF6',
    },
  };

  const renderOverviewTab = () => (
    <ScrollView 
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Portfolio Value Cards */}
      <View style={styles.cardRow}>
        <View style={[styles.card, styles.primaryCard]}>
          <Icon name="account-balance-wallet" size={24} color="white" />
          <Text style={styles.cardLabel}>Total Portfolio</Text>
          <Text style={styles.cardValue}>₹{(portfolio?.totalValue || 0).toLocaleString()}</Text>
          <Text style={styles.cardChange}>+12.5% this month</Text>
        </View>
        
        <View style={[styles.card, styles.xeraCard]}>
          <Icon name="shield" size={24} color="white" />
          <Text style={styles.cardLabel}>XERA Balance</Text>
          <Text style={styles.cardValue}>{(portfolio?.xera?.balance || 0).toLocaleString()}</Text>
          <Text style={styles.cardSubtext}>{benefits?.benefits?.tier || 'Bronze'} Tier</Text>
        </View>
      </View>

      <View style={styles.cardRow}>
        <View style={[styles.card, styles.propxCard]}>
          <Icon name="business" size={24} color="white" />
          <Text style={styles.cardLabel}>PROPX Properties</Text>
          <Text style={styles.cardValue}>{portfolio?.propx?.holdings?.length || 0}</Text>
          <Text style={styles.cardSubtext}>Avg Yield: {portfolio?.propx?.averageYield || 0}%</Text>
        </View>
        
        <View style={[styles.card, styles.diversificationCard]}>
          <Icon name="trending-up" size={24} color="white" />
          <Text style={styles.cardLabel}>Diversification</Text>
          <Text style={styles.cardValue}>{portfolio?.diversificationScore || 0}/100</Text>
          <View style={styles.progressBar}>
            <View 
              style={[styles.progressFill, { width: `${portfolio?.diversificationScore || 0}%` }]} 
            />
          </View>
        </View>
      </View>

      {/* Portfolio Distribution Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Portfolio Distribution</Text>
        <PieChart
          data={portfolioData}
          width={screenWidth - 60}
          height={200}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      </View>

      {/* Performance Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>6-Month Performance</Text>
        <LineChart
          data={performanceData}
          width={screenWidth - 60}
          height={200}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#8B5CF6' }]}
            onPress={() => navigation.navigate('XERADashboard')}
          >
            <Icon name="shield" size={20} color="white" />
            <Text style={styles.actionText}>XERA</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#06B6D4' }]}
            onPress={() => navigation.navigate('PROPXMarketplace')}
          >
            <Icon name="business" size={20} color="white" />
            <Text style={styles.actionText}>PROPX</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#10B981' }]}
            onPress={() => navigation.navigate('StakingScreen')}
          >
            <Icon name="savings" size={20} color="white" />
            <Text style={styles.actionText}>Stake</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
            onPress={() => navigation.navigate('GovernanceScreen')}
          >
            <Icon name="how-to-vote" size={20} color="white" />
            <Text style={styles.actionText}>Vote</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Activities */}
      <View style={styles.recentActivities}>
        <Text style={styles.sectionTitle}>Recent Activities</Text>
        {[
          { type: 'XERA', action: 'Staked', amount: '5,000', time: '2 hours ago', network: 'XRPL' },
          { type: 'PROPX', action: 'Invested', amount: '₹50,000', time: '1 day ago', network: 'Flare' },
          { type: 'XERA', action: 'Rewards', amount: '150', time: '3 days ago', network: 'XRPL' },
        ].map((activity, index) => (
          <View key={index} style={styles.activityItem}>
            <View style={[
              styles.activityIcon, 
              { backgroundColor: activity.type === 'XERA' ? '#8B5CF6' : '#06B6D4' }
            ]}>
              <Icon 
                name={activity.type === 'XERA' ? 'shield' : 'business'} 
                size={16} 
                color="white" 
              />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>{activity.action}</Text>
              <Text style={styles.activitySubtitle}>{activity.network} Network</Text>
            </View>
            <View style={styles.activityRight}>
              <Text style={styles.activityAmount}>{activity.amount}</Text>
              <Text style={styles.activityTime}>{activity.time}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderBenefitsTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Current Tier */}
      <View style={[styles.card, styles.tierCard]}>
        <Icon name="star" size={32} color="#F59E0B" />
        <Text style={styles.tierTitle}>{benefits?.benefits?.tier || 'Bronze'} Tier</Text>
        <Text style={styles.tierSubtitle}>Your current membership level</Text>
        
        <View style={styles.benefitsList}>
          {benefits?.benefits?.features?.map((feature, index) => (
            <View key={index} style={styles.benefitItem}>
              <Icon name="check-circle" size={16} color="#10B981" />
              <Text style={styles.benefitText}>{feature}</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.feeDiscountBox}>
          <Text style={styles.feeDiscountLabel}>Platform Fee Discount</Text>
          <Text style={styles.feeDiscountValue}>{benefits?.benefits?.feeDiscount || 0}%</Text>
        </View>
      </View>

      {/* Cross-Chain Benefits */}
      <View style={styles.crossChainCard}>
        <Text style={styles.sectionTitle}>Cross-Chain Benefits</Text>
        {benefits?.crossChainFeatures?.map((feature, index) => (
          <View key={index} style={styles.crossChainItem}>
            <Icon name="link" size={16} color="#06B6D4" />
            <Text style={styles.crossChainText}>{feature}</Text>
          </View>
        ))}
      </View>

      {/* Tier Progression */}
      <View style={styles.tierProgressCard}>
        <Text style={styles.sectionTitle}>Tier Progression</Text>
        {[
          { tier: 'Bronze', requirement: '1,000 XERA', current: true },
          { tier: 'Silver', requirement: '5,000 XERA', current: false },
          { tier: 'Gold', requirement: '25,000 XERA', current: false },
          { tier: 'Platinum', requirement: '100,000 XERA', current: false }
        ].map((tier, index) => (
          <View key={index} style={[
            styles.tierProgressItem,
            tier.current && styles.currentTierItem
          ]}>
            <Text style={[
              styles.tierProgressName,
              tier.current && styles.currentTierText
            ]}>
              {tier.tier}
            </Text>
            <Text style={styles.tierProgressRequirement}>{tier.requirement}</Text>
            {tier.current && <Icon name="check-circle" size={16} color="#10B981" />}
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderAnalyticsTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Platform Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>₹{analytics?.crossChain?.totalPortfolioValue || '1,706 Cr'}</Text>
          <Text style={styles.statLabel}>Total Value Locked</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{analytics?.crossChain?.totalUsers || '2,847'}</Text>
          <Text style={styles.statLabel}>Active Users</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{analytics?.xera?.averageYield || '8.7%'}</Text>
          <Text style={styles.statLabel}>XERA Avg Yield</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{analytics?.propx?.averageYield || '11.2%'}</Text>
          <Text style={styles.statLabel}>PROPX Avg Yield</Text>
        </View>
      </View>

      {/* Network Stats */}
      <View style={styles.networkStatsCard}>
        <Text style={styles.sectionTitle}>Network Statistics</Text>
        
        <View style={styles.networkSection}>
          <Text style={styles.networkTitle}>XRPL (XERA)</Text>
          <View style={styles.networkStatRow}>
            <Text style={styles.networkStatLabel}>Circulating Supply:</Text>
            <Text style={styles.networkStatValue}>{analytics?.xera?.circulatingSupply || '12.5M'}</Text>
          </View>
          <View style={styles.networkStatRow}>
            <Text style={styles.networkStatLabel}>Active Properties:</Text>
            <Text style={styles.networkStatValue}>{analytics?.xera?.activeProperties || '485'}</Text>
          </View>
          <View style={styles.networkStatRow}>
            <Text style={styles.networkStatLabel}>Staking Participation:</Text>
            <Text style={styles.networkStatValue}>{analytics?.xera?.stakingParticipation || '35%'}</Text>
          </View>
        </View>

        <View style={styles.networkSection}>
          <Text style={styles.networkTitle}>Flare (PROPX)</Text>
          <View style={styles.networkStatRow}>
            <Text style={styles.networkStatLabel}>Active Tokens:</Text>
            <Text style={styles.networkStatValue}>{analytics?.propx?.activeTokens || '5'}</Text>
          </View>
          <View style={styles.networkStatRow}>
            <Text style={styles.networkStatLabel}>Success Rate:</Text>
            <Text style={styles.networkStatValue}>{analytics?.propx?.successRate || '87%'}</Text>
          </View>
          <View style={styles.networkStatRow}>
            <Text style={styles.networkStatLabel}>Avg Funding:</Text>
            <Text style={styles.networkStatValue}>₹{analytics?.propx?.averageFunding || '152 Cr'}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dual Token Portfolio</Text>
        <Text style={styles.headerSubtitle}>XERA + PROPX</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
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
          style={[styles.tabButton, activeTab === 'benefits' && styles.activeTab]}
          onPress={() => setActiveTab('benefits')}
        >
          <Text style={[styles.tabText, activeTab === 'benefits' && styles.activeTabText]}>
            Benefits
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'analytics' && styles.activeTab]}
          onPress={() => setActiveTab('analytics')}
        >
          <Text style={[styles.tabText, activeTab === 'analytics' && styles.activeTabText]}>
            Analytics
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'benefits' && renderBenefitsTab()}
      {activeTab === 'analytics' && renderAnalyticsTab()}
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  refreshButton: {
    padding: 5,
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
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
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  cardRow: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 10,
  },
  card: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    minHeight: 120,
  },
  primaryCard: {
    backgroundColor: '#8B5CF6',
  },
  xeraCard: {
    backgroundColor: '#06B6D4',
  },
  propxCard: {
    backgroundColor: '#10B981',
  },
  diversificationCard: {
    backgroundColor: '#F59E0B',
  },
  cardLabel: {
    color: 'white',
    fontSize: 12,
    marginTop: 8,
    opacity: 0.9,
  },
  cardValue: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 5,
  },
  cardChange: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
    opacity: 0.9,
  },
  cardSubtext: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
    opacity: 0.9,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 2,
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
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },
  recentActivities: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  activityRight: {
    alignItems: 'flex-end',
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  tierCard: {
    backgroundColor: 'white',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tierTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 10,
  },
  tierSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  benefitsList: {
    width: '100%',
    marginBottom: 20,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    color: '#1a1a1a',
    marginLeft: 8,
  },
  feeDiscountBox: {
    backgroundColor: '#F59E0B',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  feeDiscountLabel: {
    fontSize: 12,
    color: 'white',
    opacity: 0.9,
  },
  feeDiscountValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 2,
  },
  crossChainCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  crossChainItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  crossChainText: {
    fontSize: 14,
    color: '#1a1a1a',
    marginLeft: 8,
  },
  tierProgressCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tierProgressItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  currentTierItem: {
    backgroundColor: '#8B5CF6',
    marginHorizontal: -20,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  tierProgressName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  currentTierText: {
    color: 'white',
  },
  tierProgressRequirement: {
    fontSize: 12,
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    width: (screenWidth - 50) / 2,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  networkStatsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  networkSection: {
    marginBottom: 20,
  },
  networkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  networkStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  networkStatLabel: {
    fontSize: 14,
    color: '#666',
  },
  networkStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
});

export default DualTokenDashboard;