// ============================================================================
// PROPX MARKETPLACE - Flare Network Premium Properties
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Building2, TrendingUp, MapPin, Calendar, Users, Zap, Star, ExternalLink, Filter, Search, ChevronDown } from 'lucide-react';

const PROPXMarketplace = ({ userAddress }) => {
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    city: 'ALL',
    category: 'ALL',
    developer: 'ALL',
    status: 'ALL',
    sortBy: 'recent'
  });
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [investmentAmount, setInvestmentAmount] = useState('');

  useEffect(() => {
    fetchMarketplace();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [properties, filters]);

  const fetchMarketplace = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dual-token/propx/marketplace', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setProperties(data.data.tokens || []);
      }
    } catch (error) {
      console.error('Error fetching marketplace:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...properties];

    if (filters.city !== 'ALL') {
      filtered = filtered.filter(prop => prop.cityCode === filters.city);
    }
    if (filters.category !== 'ALL') {
      filtered = filtered.filter(prop => prop.category === parseInt(filters.category));
    }
    if (filters.developer !== 'ALL') {
      filtered = filtered.filter(prop => prop.developer === filters.developer);
    }
    if (filters.status !== 'ALL') {
      filtered = filtered.filter(prop => prop.status === parseInt(filters.status));
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'funding':
        filtered.sort((a, b) => (b.fundingStatus?.raised || 0) - (a.fundingStatus?.raised || 0));
        break;
      case 'yield':
        filtered.sort((a, b) => (b.expectedROI || 0) - (a.expectedROI || 0));
        break;
      case 'recent':
        filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        break;
      default:
        break;
    }

    setFilteredProperties(filtered);
  };

  const handleInvest = async (property) => {
    try {
      if (!investmentAmount || parseFloat(investmentAmount) < 10000) {
        alert('Minimum investment is ₹10,000');
        return;
      }

      const response = await fetch('/api/dual-token/propx/invest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          tokenAddress: property.tokenContract,
          tokenAmount: parseFloat(investmentAmount) / (property.pricePerToken || 1),
          isInstitutional: parseFloat(investmentAmount) >= 1000000 // ₹10L+ is institutional
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Investment successful!');
        setInvestmentAmount('');
        setSelectedProperty(null);
        fetchMarketplace(); // Refresh data
      } else {
        alert(data.error || 'Investment failed');
      }
    } catch (error) {
      console.error('Error investing:', error);
      alert('Investment failed');
    }
  };

  const getCategoryName = (category) => {
    const categories = ['Residential', 'Commercial', 'Mixed-Use', 'Luxury', 'Industrial'];
    return categories[category] || 'Unknown';
  };

  const getStatusName = (status) => {
    const statuses = ['Pending', 'Active', 'Funded', 'Completed', 'Cancelled'];
    return statuses[status] || 'Unknown';
  };

  const mockMarketData = [
    { month: 'Jan', avgPrice: 650, volume: 125 },
    { month: 'Feb', avgPrice: 680, volume: 156 },
    { month: 'Mar', avgPrice: 625, volume: 142 },
    { month: 'Apr', avgPrice: 725, volume: 189 },
    { month: 'May', avgPrice: 750, volume: 210 },
    { month: 'Jun', avgPrice: 780, volume: 235 }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-cyan-50 to-blue-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">PROPX Marketplace</h1>
          <p className="text-gray-600 mt-1">Premium Property Tokens on Flare Network</p>
        </div>
        <div className="flex space-x-3">
          <Badge variant="outline" className="border-cyan-200 text-cyan-700 bg-cyan-50">
            <Zap className="w-4 h-4 mr-1" />
            Flare Network
          </Badge>
          <Button className="bg-cyan-600 hover:bg-cyan-700">
            <Building2 className="w-4 h-4 mr-2" />
            List Property
          </Button>
        </div>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-cyan-600 to-cyan-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-cyan-100 text-sm">Active Properties</p>
                <p className="text-2xl font-bold">{filteredProperties.length}</p>
              </div>
              <Building2 className="w-8 h-8 text-cyan-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-600 to-green-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Total Value Locked</p>
                <p className="text-2xl font-bold">₹456 Cr</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Average Yield</p>
                <p className="text-2xl font-bold">11.2%</p>
              </div>
              <Star className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-600 to-orange-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Success Rate</p>
                <p className="text-2xl font-bold">87%</p>
              </div>
              <Users className="w-8 h-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-2">City</label>
              <Select value={filters.city} onValueChange={(value) => setFilters({...filters, city: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Cities</SelectItem>
                  <SelectItem value="MUM">Mumbai</SelectItem>
                  <SelectItem value="BANG">Bangalore</SelectItem>
                  <SelectItem value="DEL">Delhi NCR</SelectItem>
                  <SelectItem value="CHEN">Chennai</SelectItem>
                  <SelectItem value="HYD">Hyderabad</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <Select value={filters.category} onValueChange={(value) => setFilters({...filters, category: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  <SelectItem value="0">Residential</SelectItem>
                  <SelectItem value="1">Commercial</SelectItem>
                  <SelectItem value="2">Mixed-Use</SelectItem>
                  <SelectItem value="3">Luxury</SelectItem>
                  <SelectItem value="4">Industrial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="1">Active</SelectItem>
                  <SelectItem value="2">Funded</SelectItem>
                  <SelectItem value="3">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Sort By</label>
              <Select value={filters.sortBy} onValueChange={(value) => setFilters({...filters, sortBy: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="funding">Highest Funded</SelectItem>
                  <SelectItem value="yield">Highest Yield</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Input placeholder="Search properties..." className="w-full" />
            </div>

            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="properties" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="analytics">Market Analytics</TabsTrigger>
          <TabsTrigger value="trending">Trending</TabsTrigger>
          <TabsTrigger value="developers">Top Developers</TabsTrigger>
        </TabsList>

        {/* Properties Tab */}
        <TabsContent value="properties" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Mock properties since we don't have real data yet */}
            {[
              {
                id: 'PROPX-GODREJ-BKC001',
                propertyName: 'Godrej BKC Residency Tower A',
                developer: { name: 'Godrej Properties Limited', brandCode: 'GODREJ', tier: 1 },
                location: 'Mumbai, BKC',
                category: 0,
                expectedROI: 850, // 8.5%
                pricePerToken: 50000, // ₹500
                totalTokens: 1000000,
                fundingStatus: { raised: 85000000, goal: 100000000, percentage: 85 },
                minInvestment: 10000,
                completionDate: '2026-03-15',
                status: 1
              },
              {
                id: 'PROPX-PRESTIGE-TECH002',
                propertyName: 'Prestige Tech Park Phase II',
                developer: { name: 'Prestige Estates Projects', brandCode: 'PRESTIGE', tier: 1 },
                location: 'Bangalore, Whitefield',
                category: 1,
                expectedROI: 1200, // 12%
                pricePerToken: 75000, // ₹750
                totalTokens: 2000000,
                fundingStatus: { raised: 275000000, goal: 300000000, percentage: 92 },
                minInvestment: 25000,
                completionDate: '2025-12-30',
                status: 1
              },
              {
                id: 'PROPX-BRIGADE-METRO003',
                propertyName: 'Brigade Metropolis Mall',
                developer: { name: 'Brigade Enterprises', brandCode: 'BRIGADE', tier: 1 },
                location: 'Bangalore, Hebbal',
                category: 1,
                expectedROI: 980, // 9.8%
                pricePerToken: 65000, // ₹650
                totalTokens: 1500000,
                fundingStatus: { raised: 167500000, goal: 250000000, percentage: 67 },
                minInvestment: 15000,
                completionDate: '2027-06-20',
                status: 1
              }
            ].map((property, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow border border-cyan-200">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-gray-900">{property.propertyName}</CardTitle>
                      <p className="text-sm text-gray-600">{property.developer.name}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Badge variant={property.developer.tier === 1 ? 'default' : 'secondary'}>
                        TIER{property.developer.tier}
                      </Badge>
                      <Badge variant="outline" className="border-cyan-200 text-cyan-700">
                        {getCategoryName(property.category)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{property.location}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Expected ROI</p>
                        <p className="font-bold text-green-600">{(property.expectedROI / 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Token Price</p>
                        <p className="font-bold">₹{property.pricePerToken.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Min Investment</p>
                        <p className="font-bold">₹{property.minInvestment.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Completion</p>
                        <p className="font-bold">{new Date(property.completionDate).getFullYear()}</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-600">Funding Progress</span>
                        <span className="text-sm font-medium">{property.fundingStatus.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full" 
                          style={{ width: `${property.fundingStatus.percentage}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-gray-500">
                        <span>₹{(property.fundingStatus.raised / 10000000).toFixed(1)} Cr raised</span>
                        <span>₹{(property.fundingStatus.goal / 10000000).toFixed(1)} Cr goal</span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                            onClick={() => setSelectedProperty(property)}
                          >
                            Invest Now
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>{property.propertyName}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium mb-2">Investment Amount (₹)</label>
                                  <Input
                                    type="number"
                                    placeholder="Minimum ₹10,000"
                                    value={investmentAmount}
                                    onChange={(e) => setInvestmentAmount(e.target.value)}
                                    min={property.minInvestment}
                                  />
                                </div>
                                <div className="bg-cyan-50 p-4 rounded-lg">
                                  <h4 className="font-medium text-cyan-900 mb-2">Investment Summary</h4>
                                  <div className="space-y-1 text-sm text-cyan-700">
                                    <p>Tokens: {investmentAmount ? Math.floor(parseFloat(investmentAmount) / property.pricePerToken) : 0}</p>
                                    <p>Expected Annual Return: ₹{investmentAmount ? Math.floor(parseFloat(investmentAmount) * (property.expectedROI / 10000)) : 0}</p>
                                    <p>Token Price: ₹{property.pricePerToken.toLocaleString()}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium mb-2">Property Details</h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span>Developer:</span>
                                      <span className="font-medium">{property.developer.brandCode}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Category:</span>
                                      <span className="font-medium">{getCategoryName(property.category)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Location:</span>
                                      <span className="font-medium">{property.location}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Expected ROI:</span>
                                      <span className="font-medium text-green-600">{(property.expectedROI / 100).toFixed(1)}%</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-lg">
                                  <h4 className="font-medium text-blue-900 mb-2">Flare Network Benefits</h4>
                                  <div className="space-y-1 text-sm text-blue-700">
                                    <p>• Oracle-verified pricing</p>
                                    <p>• Automated dividend distribution</p>
                                    <p>• Institutional investor access</p>
                                    <p>• Secondary market trading</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex space-x-3">
                              <Button 
                                className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                                onClick={() => handleInvest(property)}
                                disabled={!investmentAmount || parseFloat(investmentAmount) < property.minInvestment}
                              >
                                Confirm Investment
                              </Button>
                              <Button variant="outline" className="flex-1">
                                View Full Details
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Market Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Average Token Price Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={mockMarketData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`₹${value}`, 'Price']} />
                    <Line type="monotone" dataKey="avgPrice" stroke="#06B6D4" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trading Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mockMarketData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`₹${value}L`, 'Volume']} />
                    <Bar dataKey="volume" fill="#06B6D4" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { category: 'Commercial', yield: '12.5%', change: '+2.3%' },
                    { category: 'Luxury', yield: '11.8%', change: '+1.7%' },
                    { category: 'Mixed-Use', yield: '10.2%', change: '+1.1%' },
                    { category: 'Residential', yield: '8.9%', change: '+0.8%' }
                  ].map((cat, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="font-medium">{cat.category}</span>
                      <div className="text-right">
                        <p className="text-green-600 font-bold">{cat.yield}</p>
                        <p className="text-xs text-green-500">{cat.change}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>City Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { city: 'Bangalore', projects: 8, avgYield: '11.2%' },
                    { city: 'Mumbai', projects: 6, avgYield: '10.8%' },
                    { city: 'Chennai', projects: 4, avgYield: '10.5%' },
                    { city: 'Delhi NCR', projects: 3, avgYield: '9.9%' }
                  ].map((city, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{city.city}</p>
                        <p className="text-xs text-gray-500">{city.projects} projects</p>
                      </div>
                      <p className="text-green-600 font-bold">{city.avgYield}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Market Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-green-800">Strong Demand</p>
                    <p className="text-xs text-green-600">Commercial properties showing 23% higher interest</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-blue-800">New Listings</p>
                    <p className="text-xs text-blue-600">5 new premium properties added this month</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-purple-800">Institutional Interest</p>
                    <p className="text-xs text-purple-600">45% increase in institutional investments</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trending Tab */}
        <TabsContent value="trending" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Most Funded Properties</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'Prestige Tech Park Phase II', funded: '92%', amount: '₹275 Cr' },
                    { name: 'Godrej BKC Residency Tower A', funded: '85%', amount: '₹85 Cr' },
                    { name: 'Brigade Metropolis Mall', funded: '67%', amount: '₹167 Cr' }
                  ].map((prop, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{prop.name}</p>
                        <p className="text-sm text-gray-600">{prop.amount} raised</p>
                      </div>
                      <Badge variant="outline" className="border-green-200 text-green-700">
                        {prop.funded}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Highest Yield Properties</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'Prestige Tech Park Phase II', yield: '12.0%', category: 'Commercial' },
                    { name: 'Brigade Metropolis Mall', yield: '9.8%', category: 'Commercial' },
                    { name: 'Godrej BKC Residency Tower A', yield: '8.5%', category: 'Residential' }
                  ].map((prop, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{prop.name}</p>
                        <p className="text-sm text-gray-600">{prop.category}</p>
                      </div>
                      <Badge variant="outline" className="border-green-200 text-green-700">
                        {prop.yield}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Top Developers Tab */}
        <TabsContent value="developers" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[
              {
                name: 'Godrej Properties Limited',
                brandCode: 'GODREJ',
                tier: 'TIER1',
                projects: 25,
                totalRaised: '₹1,000 Cr',
                avgYield: '8.7%',
                cities: ['Mumbai', 'Pune', 'Bangalore']
              },
              {
                name: 'Prestige Estates Projects',
                brandCode: 'PRESTIGE',
                tier: 'TIER1',
                projects: 30,
                totalRaised: '₹1,500 Cr',
                avgYield: '11.5%',
                cities: ['Bangalore', 'Chennai', 'Hyderabad']
              },
              {
                name: 'Brigade Enterprises',
                brandCode: 'BRIGADE',
                tier: 'TIER1',
                projects: 20,
                totalRaised: '₹800 Cr',
                avgYield: '9.8%',
                cities: ['Bangalore', 'Chennai']
              }
            ].map((developer, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{developer.name}</CardTitle>
                      <p className="text-sm text-gray-600">{developer.brandCode}</p>
                    </div>
                    <Badge variant="default">{developer.tier}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Projects</p>
                        <p className="font-bold">{developer.projects}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Raised</p>
                        <p className="font-bold">{developer.totalRaised}</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-gray-600 text-sm">Average Yield</p>
                      <p className="font-bold text-xl text-green-600">{developer.avgYield}</p>
                    </div>

                    <div>
                      <p className="text-gray-600 text-sm mb-2">Primary Cities</p>
                      <div className="flex flex-wrap gap-1">
                        {developer.cities.map((city, cityIndex) => (
                          <Badge key={cityIndex} variant="outline" className="text-xs">
                            {city}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Button className="w-full" variant="outline">
                      View All Properties
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PROPXMarketplace;