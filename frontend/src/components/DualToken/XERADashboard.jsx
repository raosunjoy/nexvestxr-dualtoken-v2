// ============================================================================
// XERA DASHBOARD - XRPL Platform Token Management
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Coins, TrendingUp, Shield, MapPin, Vote, Zap, Plus, ExternalLink } from 'lucide-react';

const XERADashboard = ({ userAddress }) => {
  const [xeraPortfolio, setXeraPortfolio] = useState(null);
  const [cityPools, setCityPools] = useState([]);
  const [benefits, setBenefits] = useState(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchXERAData();
  }, [userAddress]);

  const fetchXERAData = async () => {
    try {
      setLoading(true);
      
      // Fetch XERA portfolio
      const portfolioResponse = await fetch(`/api/dual-token/xera/portfolio/${userAddress}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const portfolioData = await portfolioResponse.json();
      if (portfolioData.success) {
        setXeraPortfolio(portfolioData.data);
      }

      // Fetch city pools
      const poolsResponse = await fetch('/api/dual-token/xera/city-pools');
      const poolsData = await poolsResponse.json();
      if (poolsData.success) {
        setCityPools(Object.entries(poolsData.data).map(([code, data]) => ({ code, ...data })));
      }

      // Fetch benefits
      const benefitsResponse = await fetch(`/api/dual-token/xera/benefits/${userAddress}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const benefitsData = await benefitsResponse.json();
      if (benefitsData.success) {
        setBenefits(benefitsData.data);
      }

    } catch (error) {
      console.error('Error fetching XERA data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStakeXERA = async () => {
    try {
      if (!stakeAmount || parseFloat(stakeAmount) <= 0) return;
      
      // This would integrate with XRPL for staking
      console.log('Staking XERA:', stakeAmount);
      // Add actual staking logic here
      
      setStakeAmount('');
      fetchXERAData(); // Refresh data
    } catch (error) {
      console.error('Error staking XERA:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const portfolioAllocation = [
    { name: 'Mumbai', value: 35, color: '#8B5CF6' },
    { name: 'Bangalore', value: 28, color: '#06B6D4' },
    { name: 'Delhi NCR', value: 25, color: '#10B981' },
    { name: 'Chennai', value: 12, color: '#F59E0B' }
  ];

  const stakingRewards = [
    { month: 'Jan', rewards: 45, balance: 2300 },
    { month: 'Feb', rewards: 52, balance: 2400 },
    { month: 'Mar', rewards: 48, balance: 2500 },
    { month: 'Apr', rewards: 67, balance: 2650 },
    { month: 'May', rewards: 78, balance: 2800 },
    { month: 'Jun', rewards: 85, balance: 2950 }
  ];

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-purple-50 to-indigo-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">XERA Platform Dashboard</h1>
          <p className="text-gray-600 mt-1">XRPL Diversified Real Estate Portfolio</p>
        </div>
        <div className="flex space-x-3">
          <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50">
            <Shield className="w-4 h-4 mr-1" />
            XRPL Network
          </Badge>
          <Button className="bg-purple-600 hover:bg-purple-700">
            <ExternalLink className="w-4 h-4 mr-2" />
            View on XRPL Explorer
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">XERA Balance</p>
                <p className="text-2xl font-bold">{(xeraPortfolio?.balance || 0).toLocaleString()}</p>
              </div>
              <Coins className="w-8 h-8 text-purple-200" />
            </div>
            <div className="mt-4">
              <p className="text-purple-100 text-sm">≈ ₹{((xeraPortfolio?.balance || 0) * 1247).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-600 to-green-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Portfolio Value</p>
                <p className="text-2xl font-bold">₹{(xeraPortfolio?.metrics?.totalValue || 0).toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-200" />
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="text-sm">+{xeraPortfolio?.metrics?.yield || 8.5}% yield</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Staking APY</p>
                <p className="text-2xl font-bold">{benefits?.benefits?.stakingAPY || 0}%</p>
              </div>
              <Zap className="w-8 h-8 text-blue-200" />
            </div>
            <div className="mt-4">
              <Badge className="bg-blue-500 hover:bg-blue-600">
                {benefits?.benefits?.tier || 'Bronze'} Tier
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-sm">Diversification</p>
                <p className="text-2xl font-bold">{xeraPortfolio?.metrics?.diversificationScore || 0}/100</p>
              </div>
              <Shield className="w-8 h-8 text-indigo-200" />
            </div>
            <div className="mt-4">
              <div className="w-full bg-indigo-800 rounded-full h-2">
                <div 
                  className="bg-indigo-200 h-2 rounded-full" 
                  style={{ width: `${xeraPortfolio?.metrics?.diversificationScore || 0}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="portfolio" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="staking">Staking</TabsTrigger>
          <TabsTrigger value="city-pools">City Pools</TabsTrigger>
          <TabsTrigger value="governance">Governance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* City Allocation */}
            <Card>
              <CardHeader>
                <CardTitle>Geographic Diversification</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={portfolioAllocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {portfolioAllocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {portfolioAllocation.map((city, index) => (
                    <div key={index} className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: city.color }}></div>
                      <span className="text-sm">{city.name}: {city.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Property Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Property Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { category: 'Residential', percentage: 45, count: 125, avgValue: '₹2.8 Cr' },
                    { category: 'Commercial', percentage: 35, count: 89, avgValue: '₹4.2 Cr' },
                    { category: 'Mixed-Use', percentage: 15, count: 34, avgValue: '₹3.5 Cr' },
                    { category: 'Land', percentage: 5, count: 12, avgValue: '₹1.9 Cr' }
                  ].map((cat, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">{cat.category}</span>
                        <span className="text-sm text-gray-600">{cat.percentage}% • {cat.count} properties</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full" 
                          style={{ width: `${cat.percentage}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500">Avg Value: {cat.avgValue}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle>Recent XERA Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { 
                    type: 'Property Added', 
                    details: 'Whitefield Residential Complex - Bangalore',
                    amount: '+2,500 XERA',
                    time: '2 hours ago',
                    txHash: '0x1234...5678'
                  },
                  { 
                    type: 'Staking Reward', 
                    details: 'Monthly staking rewards distributed',
                    amount: '+125 XERA',
                    time: '1 day ago',
                    txHash: '0x2345...6789'
                  },
                  { 
                    type: 'Governance Vote', 
                    details: 'Voted on Mumbai Pool expansion proposal',
                    amount: '500 voting power',
                    time: '3 days ago',
                    txHash: '0x3456...789a'
                  }
                ].map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-100">
                    <div>
                      <p className="font-medium text-purple-900">{activity.type}</p>
                      <p className="text-sm text-purple-600">{activity.details}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-purple-700">{activity.amount}</p>
                      <Button size="sm" variant="ghost" className="text-xs p-1 h-auto">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View on XRPL
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staking Tab */}
        <TabsContent value="staking" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Staking Interface */}
            <Card>
              <CardHeader>
                <CardTitle>Stake XERA Tokens</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Amount to Stake</label>
                    <Input
                      type="number"
                      placeholder="Enter XERA amount"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                    />
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-medium text-purple-900 mb-2">Staking Benefits</h4>
                    <div className="space-y-1 text-sm text-purple-700">
                      <p>• Current APY: {benefits?.benefits?.stakingAPY || 0}%</p>
                      <p>• Estimated Monthly Rewards: {stakeAmount ? Math.floor(parseFloat(stakeAmount) * 0.006) : 0} XERA</p>
                      <p>• Voting Power: {stakeAmount ? Math.floor(parseFloat(stakeAmount) / 100) : 0}</p>
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={handleStakeXERA}
                    disabled={!stakeAmount || parseFloat(stakeAmount) <= 0}
                  >
                    Stake XERA
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Staking Rewards Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Staking Rewards History</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={stakingRewards}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="rewards" 
                      stroke="#8B5CF6" 
                      fill="url(#colorGradient)" 
                    />
                    <defs>
                      <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Current Stakes */}
          <Card>
            <CardHeader>
              <CardTitle>Current Stakes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { 
                    amount: '2,500',
                    duration: '6 months',
                    apy: '8%',
                    rewards: '127',
                    status: 'Active',
                    unlockDate: '2024-12-15'
                  },
                  { 
                    amount: '1,000',
                    duration: '3 months',
                    apy: '6%',
                    rewards: '45',
                    status: 'Active',
                    unlockDate: '2024-09-15'
                  }
                ].map((stake, index) => (
                  <Card key={index} className="border border-purple-200">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{stake.amount} XERA</span>
                          <Badge variant={stake.status === 'Active' ? 'default' : 'secondary'}>
                            {stake.status}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>Duration: {stake.duration}</p>
                          <p>APY: {stake.apy}</p>
                          <p>Rewards: +{stake.rewards} XERA</p>
                          <p>Unlock: {stake.unlockDate}</p>
                        </div>
                        <Button size="sm" variant="outline" className="w-full">
                          Claim Rewards
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* City Pools Tab */}
        <TabsContent value="city-pools" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {cityPools.map((pool, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{pool.name}</CardTitle>
                    <MapPin className="w-5 h-5 text-gray-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Total Value</p>
                        <p className="font-bold text-lg">{pool.totalValue}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Properties</p>
                        <p className="font-bold text-lg">{pool.properties}</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600">Average Yield</p>
                      <p className="font-bold text-xl text-green-600">{pool.averageYield}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-2">Categories</p>
                      <div className="flex flex-wrap gap-1">
                        {pool.categories.map((category, catIndex) => (
                          <Badge key={catIndex} variant="outline" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Button className="w-full" variant="outline">
                      View Pool Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Governance Tab */}
        <TabsContent value="governance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
              <CardHeader>
                <CardTitle className="text-blue-800">Voting Power</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900">
                  {benefits?.benefits?.votingPower || 0}
                </div>
                <p className="text-blue-600 mt-2">Based on XERA holdings</p>
                <p className="text-sm text-blue-500 mt-1">
                  1 vote per 100 XERA tokens
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Proposals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <Vote className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No active proposals</p>
                  <p className="text-sm text-gray-500">Check back later for governance votes</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Governance Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Proposals:</span>
                    <span className="font-medium">12</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Your Votes:</span>
                    <span className="font-medium">8</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Participation:</span>
                    <span className="font-medium text-green-600">67%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Proposals */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Proposals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    title: "Expand Mumbai Residential Pool",
                    description: "Add 15 new residential properties in Mumbai suburbs",
                    status: "Passed",
                    votes: "1,250,000",
                    yourVote: "Yes",
                    endDate: "2024-05-15"
                  },
                  {
                    title: "Increase Bangalore Commercial Allocation",
                    description: "Allocate additional 20% to commercial properties in Bangalore",
                    status: "Active",
                    votes: "850,000",
                    yourVote: null,
                    endDate: "2024-06-20"
                  },
                  {
                    title: "Platform Fee Adjustment",
                    description: "Reduce platform fees from 2% to 1.5% for all transactions",
                    status: "Rejected",
                    votes: "750,000",
                    yourVote: "No",
                    endDate: "2024-04-30"
                  }
                ].map((proposal, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium">{proposal.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{proposal.description}</p>
                      </div>
                      <Badge variant={
                        proposal.status === 'Passed' ? 'default' : 
                        proposal.status === 'Active' ? 'secondary' : 
                        'destructive'
                      }>
                        {proposal.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Total Votes: {proposal.votes}</span>
                      {proposal.yourVote && <span>Your Vote: {proposal.yourVote}</span>}
                      <span>Ends: {proposal.endDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={stakingRewards}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} XERA`, 'Balance']} />
                    <Area type="monotone" dataKey="balance" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Yield by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { category: 'Residential', yield: 8.2 },
                    { category: 'Commercial', yield: 10.5 },
                    { category: 'Mixed-Use', yield: 9.1 },
                    { category: 'Land', yield: 6.8 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}%`, 'Yield']} />
                    <Bar dataKey="yield" fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default XERADashboard;