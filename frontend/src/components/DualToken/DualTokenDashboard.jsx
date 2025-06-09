// ============================================================================
// DUAL TOKEN DASHBOARD - UNIFIED XERA & PROPX PORTFOLIO
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, Building2, Globe, Zap, Shield, Award } from 'lucide-react';

const DualTokenDashboard = ({ userAddress }) => {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [benefits, setBenefits] = useState(null);

  useEffect(() => {
    fetchPortfolioData();
    fetchAnalytics();
    fetchBenefits();
  }, [userAddress]);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dual-token/portfolio/${userAddress}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setPortfolio(data.data);
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/dual-token/analytics/platform');
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchBenefits = async () => {
    try {
      const response = await fetch(`/api/dual-token/cross-chain-benefits/${userAddress}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setBenefits(data.data);
      }
    } catch (error) {
      console.error('Error fetching benefits:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const portfolioData = [
    { name: 'XERA', value: portfolio?.xera?.balance || 0, color: '#8B5CF6' },
    { name: 'PROPX', value: portfolio?.propx?.totalValue || 0, color: '#06B6D4' }
  ];

  const performanceData = [
    { month: 'Jan', xera: 850, propx: 1200 },
    { month: 'Feb', xera: 920, propx: 1350 },
    { month: 'Mar', xera: 880, propx: 1180 },
    { month: 'Apr', xera: 1100, propx: 1480 },
    { month: 'May', xera: 1250, propx: 1620 },
    { month: 'Jun', xera: 1180, propx: 1580 }
  ];

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-purple-50 to-cyan-50 min-h-screen">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dual Token Portfolio</h1>
          <p className="text-gray-600 mt-1">XERA Platform Token + PROPX Premium Properties</p>
        </div>
        <div className="flex space-x-3">
          <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50">
            <Globe className="w-4 h-4 mr-1" />
            XRPL Network
          </Badge>
          <Badge variant="outline" className="border-cyan-200 text-cyan-700 bg-cyan-50">
            <Zap className="w-4 h-4 mr-1" />
            Flare Network
          </Badge>
        </div>
      </div>

      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Total Portfolio Value</p>
                <p className="text-2xl font-bold">₹{(portfolio?.totalValue || 0).toLocaleString()}</p>
              </div>
              <Wallet className="w-8 h-8 text-purple-200" />
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="text-sm">+12.5% this month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-600 to-cyan-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-cyan-100 text-sm">XERA Holdings</p>
                <p className="text-2xl font-bold">{(portfolio?.xera?.balance || 0).toLocaleString()}</p>
              </div>
              <Shield className="w-8 h-8 text-cyan-200" />
            </div>
            <div className="mt-4">
              <Badge className="bg-cyan-500 hover:bg-cyan-600">
                {benefits?.benefits?.tier || 'Bronze'} Tier
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">PROPX Properties</p>
                <p className="text-2xl font-bold">{portfolio?.propx?.holdings?.length || 0}</p>
              </div>
              <Building2 className="w-8 h-8 text-emerald-200" />
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-sm">Avg Yield: {portfolio?.propx?.averageYield || 0}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-600 to-orange-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Diversification Score</p>
                <p className="text-2xl font-bold">{portfolio?.diversificationScore || 0}/100</p>
              </div>
              <Award className="w-8 h-8 text-orange-200" />
            </div>
            <div className="mt-4">
              <div className="w-full bg-orange-800 rounded-full h-2">
                <div 
                  className="bg-orange-200 h-2 rounded-full" 
                  style={{ width: `${portfolio?.diversificationScore || 0}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="portfolio" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="xera">XERA Dashboard</TabsTrigger>
          <TabsTrigger value="propx">PROPX Marketplace</TabsTrigger>
          <TabsTrigger value="benefits">Benefits & Tiers</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Portfolio Overview Tab */}
        <TabsContent value="portfolio" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Portfolio Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={portfolioData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {portfolioData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center space-x-4 mt-4">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                    <span className="text-sm">XERA (Platform)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-cyan-500 rounded-full mr-2"></div>
                    <span className="text-sm">PROPX (Properties)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>6-Month Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `₹${value}`} />
                    <Line type="monotone" dataKey="xera" stroke="#8B5CF6" strokeWidth={2} />
                    <Line type="monotone" dataKey="propx" stroke="#06B6D4" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { type: 'XERA', action: 'Staked', amount: '5,000', time: '2 hours ago', network: 'XRPL' },
                  { type: 'PROPX', action: 'Invested', amount: '₹50,000', time: '1 day ago', network: 'Flare' },
                  { type: 'XERA', action: 'Received Rewards', amount: '150', time: '3 days ago', network: 'XRPL' },
                  { type: 'PROPX', action: 'Dividend Claimed', amount: '₹2,500', time: '5 days ago', network: 'Flare' }
                ].map((transaction, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Badge variant={transaction.type === 'XERA' ? 'default' : 'secondary'}>
                        {transaction.type}
                      </Badge>
                      <div>
                        <p className="font-medium">{transaction.action}</p>
                        <p className="text-sm text-gray-500">{transaction.network} Network</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{transaction.amount}</p>
                      <p className="text-sm text-gray-500">{transaction.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* XERA Dashboard Tab */}
        <TabsContent value="xera" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
              <CardHeader>
                <CardTitle className="text-purple-800">XERA Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-900">
                  {(portfolio?.xera?.balance || 0).toLocaleString()}
                </div>
                <p className="text-purple-600 mt-2">≈ ₹{((portfolio?.xera?.balance || 0) * 1247).toLocaleString()}</p>
                <div className="flex space-x-2 mt-4">
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                    Stake XERA
                  </Button>
                  <Button size="sm" variant="outline">
                    View on XRPL
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>City Pools</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { city: 'Mumbai', allocation: '35%', yield: '9.2%' },
                    { city: 'Bangalore', allocation: '28%', yield: '10.1%' },
                    { city: 'Delhi NCR', allocation: '25%', yield: '8.8%' },
                    { city: 'Chennai', allocation: '12%', yield: '9.5%' }
                  ].map((pool, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="font-medium">{pool.city}</span>
                      <div className="text-right">
                        <p className="text-sm">{pool.allocation}</p>
                        <p className="text-xs text-green-600">{pool.yield}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Staking Rewards</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {benefits?.benefits?.stakingAPY || 0}% APY
                </div>
                <p className="text-gray-600 mt-2">Current staking rate</p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Staked Amount:</span>
                    <span>2,500 XERA</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending Rewards:</span>
                    <span className="text-green-600">+127 XERA</span>
                  </div>
                </div>
                <Button size="sm" className="w-full mt-4">
                  Claim Rewards
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PROPX Marketplace Tab */}
        <TabsContent value="propx" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {[
              {
                id: 'PROPX-GODREJ-BKC001',
                name: 'Godrej BKC Residency Tower A',
                developer: 'Godrej Properties',
                location: 'Mumbai, BKC',
                funded: 85,
                minInvestment: '₹10,000',
                expectedROI: '8.5%',
                category: 'Residential',
                tier: 'TIER1'
              },
              {
                id: 'PROPX-PRESTIGE-TECH002',
                name: 'Prestige Tech Park Phase II',
                developer: 'Prestige Estates',
                location: 'Bangalore, Whitefield',
                funded: 92,
                minInvestment: '₹25,000',
                expectedROI: '12.0%',
                category: 'Commercial',
                tier: 'TIER1'
              },
              {
                id: 'PROPX-BRIGADE-METRO003',
                name: 'Brigade Metropolis Mall',
                developer: 'Brigade Enterprises',
                location: 'Bangalore, Hebbal',
                funded: 67,
                minInvestment: '₹15,000',
                expectedROI: '9.8%',
                category: 'Commercial',
                tier: 'TIER1'
              }
            ].map((property, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{property.name}</CardTitle>
                      <p className="text-sm text-gray-600">{property.developer}</p>
                    </div>
                    <Badge variant={property.tier === 'TIER1' ? 'default' : 'secondary'}>
                      {property.tier}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Location:</span>
                      <span className="text-sm font-medium">{property.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Expected ROI:</span>
                      <span className="text-sm font-medium text-green-600">{property.expectedROI}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Min Investment:</span>
                      <span className="text-sm font-medium">{property.minInvestment}</span>
                    </div>
                    
                    <div className="mt-4">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Funding Progress</span>
                        <span className="text-sm font-medium">{property.funded}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-cyan-500 h-2 rounded-full" 
                          style={{ width: `${property.funded}%` }}
                        ></div>
                      </div>
                    </div>

                    <Button className="w-full mt-4" variant="outline">
                      View Details & Invest
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Benefits & Tiers Tab */}
        <TabsContent value="benefits" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100">
              <CardHeader>
                <CardTitle className="text-amber-800">Current Tier Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-amber-900">
                    {benefits?.benefits?.tier || 'Bronze'}
                  </div>
                  <p className="text-amber-700">Your current tier level</p>
                </div>
                
                <div className="space-y-3">
                  {benefits?.benefits?.features?.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-amber-200 rounded-lg">
                  <div className="flex justify-between">
                    <span className="font-medium">Fee Discount:</span>
                    <span className="text-amber-800 font-bold">
                      {benefits?.benefits?.feeDiscount || 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cross-Chain Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {benefits?.crossChainFeatures?.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Zap className="w-5 h-5 text-cyan-500" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Tier Progression</h4>
                  <div className="space-y-2">
                    {[
                      { tier: 'Bronze', requirement: '1,000 XERA', current: true },
                      { tier: 'Silver', requirement: '5,000 XERA', current: false },
                      { tier: 'Gold', requirement: '25,000 XERA', current: false },
                      { tier: 'Platinum', requirement: '100,000 XERA', current: false }
                    ].map((tier, index) => (
                      <div key={index} className={`flex justify-between p-2 rounded ${tier.current ? 'bg-purple-100' : 'bg-gray-50'}`}>
                        <span className={tier.current ? 'font-medium text-purple-800' : 'text-gray-600'}>
                          {tier.tier}
                        </span>
                        <span className="text-sm text-gray-600">{tier.requirement}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Value Locked</p>
                    <p className="text-2xl font-bold">₹{analytics?.crossChain?.totalPortfolioValue || '1,706 Cr'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active Users</p>
                    <p className="text-xl font-medium">{analytics?.crossChain?.totalUsers || '2,847'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cross-Chain Users</p>
                    <p className="text-xl font-medium">{analytics?.crossChain?.crossChainUsers || '1,523'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>XERA Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Circulating Supply</p>
                    <p className="text-xl font-medium">{analytics?.xera?.circulatingSupply || '12.5M'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active Properties</p>
                    <p className="text-xl font-medium">{analytics?.xera?.activeProperties || '485'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Average Yield</p>
                    <p className="text-xl font-medium text-green-600">{analytics?.xera?.averageYield || '8.7%'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>PROPX Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Active Tokens</p>
                    <p className="text-xl font-medium">{analytics?.propx?.activeTokens || '5'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Success Rate</p>
                    <p className="text-xl font-medium text-green-600">{analytics?.propx?.successRate || '87%'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Average Yield</p>
                    <p className="text-xl font-medium text-green-600">{analytics?.propx?.averageYield || '11.2%'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DualTokenDashboard;