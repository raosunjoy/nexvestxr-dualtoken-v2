                            <div className="text-2xl font-bold">
                                ₹{xeraData?.totalPropertyValue ? (parseFloat(xeraData.totalPropertyValue) / 10000000).toFixed(1) + 'Cr' : '0.0Cr'}
                            </div>
                            <div className="text-white/70 text-sm">Real estate backing</div>
                        </div>

                        <div className="bg-white/10 rounded-lg p-4">
                            <div className="text-white/70 text-sm">Diversification Score</div>
                            <div className="text-2xl font-bold">
                                {xeraData?.diversificationScore || '0'}/100
                            </div>
                            <div className="text-white/70 text-sm">
                                {xeraData?.diversificationScore >= 80 ? 'Excellent' : 
                                 xeraData?.diversificationScore >= 60 ? 'Good' : 'Moderate'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-4 right-4">
                        <Building2 className="h-32 w-32" />
                    </div>
                    <div className="absolute bottom-4 left-4">
                        <MapPin className="h-24 w-24" />
                    </div>
                </div>
            </div>

            {/* City Portfolio Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                        City-wise Portfolio
                    </h3>
                    
                    <div className="space-y-4">
                        {tokenConfig.cities.tier1A.concat(tokenConfig.cities.tier1B).map((city) => (
                            <div key={city.code} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                        <span className="text-xs font-semibold text-blue-600">{city.code}</span>
                                    </div>
                                    <div>
                                        <div className="font-medium">{city.name}</div>
                                        <div className="text-sm text-gray-500">{city.multiplier}x multiplier</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-semibold">₹{Math.floor(Math.random() * 50) + 10}L</div>
                                    <div className="text-sm text-gray-500">{Math.floor(Math.random() * 15) + 5} properties</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <PieChart className="h-5 w-5 mr-2 text-green-600" />
                        Category Breakdown
                    </h3>
                    
                    <div className="space-y-4">
                        {Object.entries(tokenConfig.categories).map(([key, category]) => (
                            <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <div 
                                        className="w-4 h-4 rounded-full"
                                        style={{ backgroundColor: category.color }}
                                    ></div>
                                    <div>
                                        <div className="font-medium">{category.name}</div>
                                        <div className="text-sm text-gray-500">{category.multiplier}x multiplier</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-semibold">{Math.floor(Math.random() * 40) + 10}%</div>
                                    <div className="text-sm text-gray-500">of portfolio</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Investment Actions */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Investment Actions</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button className="p-4 border-2 border-blue-200 rounded-lg hover:border-blue-400 transition-colors group">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                <Coins className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="text-left">
                                <div className="font-medium">Buy XERA</div>
                                <div className="text-sm text-gray-500">Diversified investment</div>
                            </div>
                        </div>
                    </button>

                    <button className="p-4 border-2 border-green-200 rounded-lg hover:border-green-400 transition-colors group">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                                <TrendingUp className="h-5 w-5 text-green-600" />
                            </div>
                            <div className="text-left">
                                <div className="font-medium">Claim Dividends</div>
                                <div className="text-sm text-gray-500">Monthly returns</div>
                            </div>
                        </div>
                    </button>

                    <button className="p-4 border-2 border-purple-200 rounded-lg hover:border-purple-400 transition-colors group">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                                <Trophy className="h-5 w-5 text-purple-600" />
                            </div>
                            <div className="text-left">
                                <div className="font-medium">Governance</div>
                                <div className="text-sm text-gray-500">Vote on proposals</div>
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// PROPX TOKEN MARKETPLACE COMPONENT
// ============================================================================

// frontend/src/components/PROPX/PROPXMarketplace.jsx
import React, { useState, useEffect } from 'react';
import { Building, MapPin, Star, Clock, TrendingUp, Filter, Search } from 'lucide-react';

const PROPXMarketplace = () => {
    const [propxTokens, setPropxTokens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        city: 'ALL',
        category: 'ALL',
        developer: 'ALL',
        status: 'ACTIVE'
    });
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadPROPXTokens();
    }, [filters]);

    const loadPROPXTokens = async () => {
        try {
            const response = await fetch('/api/smart-contracts/propx/marketplace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(filters)
            });
            const data = await response.json();
            setPropxTokens(data.data || []);
        } catch (error) {
            console.error('Failed to load PROPX tokens:', error);
        } finally {
            setLoading(false);
        }
    };

    const mockPROPXTokens = [
        {
            id: 1,
            symbol: "PROPX-GODREJ-BKC001",
            name: "Godrej BKC Residency Tower A",
            developer: "GODREJ",
            city: "Mumbai",
            category: "LUXURY",
            currentPrice: "₹525",
            change24h: "+2.5%",
            totalTokens: "1,000,000",
            raised: "₹45 Cr",
            goal: "₹50 Cr",
            fundingProgress: 90,
            status: "ACTIVE",
            image: "/assets/properties/godrej-bkc.jpg",
            yield: "8.5%",
            occupancy: "95%"
        },
        {
            id: 2,
            symbol: "PROPX-PRESTIGE-TECH002",
            name: "Prestige Tech Park Phase II",
            developer: "PRESTIGE",
            city: "Bangalore",
            category: "COMMERCIAL",
            currentPrice: "₹780",
            change24h: "+1.8%",
            totalTokens: "2,000,000",
            raised: "₹126 Cr",
            goal: "₹150 Cr",
            fundingProgress: 84,
            status: "ACTIVE",
            image: "/assets/properties/prestige-tech.jpg",
            yield: "12.2%",
            occupancy: "92%"
        },
        {
            id: 3,
            symbol: "PROPX-BRIGADE-BANG003",
            name: "Brigade Metropolis Mall",
            developer: "BRIGADE",
            city: "Bangalore",
            category: "COMMERCIAL",
            currentPrice: "₹650",
            change24h: "-0.5%",
            totalTokens: "1,500,000",
            raised: "₹97.5 Cr",
            goal: "₹97.5 Cr",
            fundingProgress: 100,
            status: "FUNDED",
            image: "/assets/properties/brigade-mall.jpg",
            yield: "9.8%",
            occupancy: "88%"
        }
    ];

    const getDeveloperInfo = (devCode) => {
        const allDevs = [...tokenConfig.developers.tier1, ...tokenConfig.developers.tier2];
        return allDevs.find(dev => dev.brandCode === devCode);
    };

    const getCategoryColor = (category) => {
        return tokenConfig.categories[category]?.color || '#6b7280';
    };

    if (loading) {
        return (
            <div className="animate-pulse space-y-6">
                <div className="h-16 bg-gray-200 rounded-lg"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-80 bg-gray-200 rounded-lg"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">PROPX Marketplace</h1>
                    <p className="text-gray-600">Premium property tokens from verified developers</p>
                </div>
                
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search properties..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                        <Filter className="h-4 w-4" />
                        <span>Filters</span>
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg p-4 shadow-sm border">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <select 
                        value={filters.city}
                        onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="ALL">All Cities</option>
                        {[...tokenConfig.cities.tier1A, ...tokenConfig.cities.tier1B].map(city => (
                            <option key={city.code} value={city.code}>{city.name}</option>
                        ))}
                    </select>

                    <select 
                        value={filters.category}
                        onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="ALL">All Categories</option>
                        {Object.entries(tokenConfig.categories).map(([key, cat]) => (
                            <option key={key} value={key}>{cat.name}</option>
                        ))}
                    </select>

                    <select 
                        value={filters.developer}
                        onChange={(e) => setFilters(prev => ({ ...prev, developer: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="ALL">All Developers</option>
                        {tokenConfig.developers.tier1.map(dev => (
                            <option key={dev.brandCode} value={dev.brandCode}>{dev.name}</option>
                        ))}
                    </select>

                    <select 
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="ALL">All Status</option>
                        <option value="ACTIVE">Active Funding</option>
                        <option value="FUNDED">Fully Funded</option>
                        <option value="TRADING">Trading</option>
                    </select>
                </div>
            </div>

            {/* PROPX Token Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockPROPXTokens.map((token) => {
                    const developerInfo = getDeveloperInfo(token.developer);
                    const categoryColor = getCategoryColor(token.category);

                    return (
                        <div key={token.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                            {/* Property Image */}
                            <div className="relative h-48 bg-gray-200">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                                <div className="absolute top-3 left-3 flex space-x-2">
                                    <span 
                                        className="px-2 py-1 rounded-full text-xs font-medium text-white"
                                        style={{ backgroundColor: categoryColor }}
                                    >
                                        {tokenConfig.categories[token.category]?.name}
                                    </span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        token.status === 'ACTIVE' ? 'bg-green-500 text-white' :
                                        token.status === 'FUNDED' ? 'bg-blue-500 text-white' :
                                        'bg-gray-500 text-white'
                                    }`}>
                                        {token.status}
                                    </span>
                                </div>
                                <div className="absolute bottom-3 left-3 text-white">
                                    <div className="text-sm font-medium">{token.symbol}</div>
                                    <div className="flex items-center text-xs">
                                        <MapPin className="h-3 w-3 mr-1" />
                                        {token.city}
                                    </div>
                                </div>
                            </div>

                            {/* Property Info */}
                            <div className="p-6">
                                <div className="mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{token.name}</h3>
                                    <div className="flex items-center text-sm text-gray-600">
                                        <Building className="h-4 w-4 mr-1" />
                                        {developerInfo?.name}
                                    </div>
                                </div>

                                {/* Price & Performance */}
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <div className="text-xl font-bold text-gray-900">{token.currentPrice}</div>
                                        <div className={`text-sm flex items-center ${
                                            token.change24h.startsWith('+') ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            <TrendingUp className="h-3 w-3 mr-1" />
                                            {token.change24h}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-gray-500">Annual Yield</div>
                                        <div className="text-lg font-semibold text-green-600">{token.yield}</div>
                                    </div>
                                </div>

                                {/* Funding Progress */}
                                {token.status === 'ACTIVE' && (
                                    <div className="mb-4">
                                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                                            <span>Funding Progress</span>
                                            <span>{token.fundingProgress}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div 
                                                className="bg-blue-600 h-2 rounded-full" 
                                                style={{ width: `${token.fundingProgress}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                                            <span>Raised: {token.raised}</span>
                                            <span>Goal: {token.goal}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Metrics */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="text-center p-2 bg-gray-50 rounded">
                                        <div className="text-xs text-gray-500">Tokens</div>
                                        <div className="font-semibold">{token.totalTokens}</div>
                                    </div>
                                    <div className="text-center p-2 bg-gray-50 rounded">
                                        <div className="text-xs text-gray-500">Occupancy</div>
                                        <div className="font-semibold">{token.occupancy}</div>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium">
                                    {token.status === 'ACTIVE' ? 'Invest Now' : 
                                     token.status === 'FUNDED' ? 'View Details' : 'Trade'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Load More */}
            <div className="text-center">
                <button className="px-8 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
                    Load More Properties
                </button>
            </div>
        </div>
    );
};

// ============================================================================
// XERA TRADING COMPONENT
// ============================================================================

// frontend/src/components/XERA/XERATradingInterface.jsx
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Wallet, DollarSign } from 'lucide-react';

const XERATradingInterface = () => {
    const [xeraPrice, setXeraPrice] = useState(null);
    const [orderForm, setOrderForm] = useState({
        type: 'buy',
        amount: '',
        orderType: 'market'
    });
    const [userBalance, setUserBalance] = useState(null);

    useEffect(() => {
        loadXERAPrice();
        loadUserBalance();
    }, []);

    const loadXERAPrice = async () => {
        try {
            const response = await fetch('/api/smart-contracts/xera/price');
            const data = await response.json();
            setXeraPrice(data.data);
        } catch (error) {
            console.error('Failed to load XERA price:', error);
        }
    };

    const loadUserBalance = async () => {
        try {
            const response = await fetch('/api/smart-contracts/xera/balance', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            setUserBalance(data.data);
        } catch (error) {
            console.error('Failed to load user balance:', error);
        }
    };

    const handleTrade = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/smart-contracts/xera/trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(orderForm)
            });
            
            const result = await response.json();
            if (result.success) {
                // Handle successful trade
                loadUserBalance();
                setOrderForm({ type: 'buy', amount: '', orderType: 'market' });
            }
        } catch (error) {
            console.error('Trade failed:', error);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* XERA Price Header */}
            <div 
                className="rounded-xl p-6 text-white"
                style={{ background: tokenConfig.tokens.xera.colors.gradient }}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">XERA Trading</h1>
                        <p className="text-white/80">Real Estate Portfolio Token</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold">₹{xeraPrice?.currentPrice || '0.00'}</div>
                        <div className={`flex items-center ${
                            xeraPrice?.change24h >= 0 ? 'text-green-300' : 'text-red-300'
                        }`}>
                            {xeraPrice?.change24h >= 0 ? 
                                <TrendingUp className="h-4 w-4 mr-1" /> : 
                                <TrendingDown className="h-4 w-4 mr-1" />
                            }
                            {xeraPrice?.change24h >= 0 ? '+' : ''}{xeraPrice?.change24h || '0.00'}%
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trading Form */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Trade XERA</h3>
                    
                    <form onSubmit={handleTrade} className="space-y-4">
                        {/* Buy/Sell Toggle */}
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            <button
                                type="button"
                                onClick={() => setOrderForm(prev => ({ ...prev, type: 'buy' }))}
                                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                                    orderForm.type === 'buy' 
                                        ? 'bg-green-600 text-white' 
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Buy
                            </button>
                            <button
                                type="button"
                                onClick={() => setOrderForm(prev => ({ ...prev, type: 'sell' }))}
                                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                                    orderForm.type === 'sell' 
                                        ? 'bg-red-600 text-white' 
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Sell
                            </button>
                        </div>

                        {/* Order Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Order Type</label>
                            <select
                                value={orderForm.orderType}
                                onChange={(e) => setOrderForm(prev => ({ ...prev, orderType: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="market">Market Order</option>
                                <option value="limit">Limit Order</option>
                            </select>
                        </div>

                        {/* Amount */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Amount (XERA)
                            </label>
                            <input
                                type="number"
                                value={orderForm.amount}
                                onChange={(e) => setOrderForm(prev => ({ ...prev, amount: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                required
                            />
                            <div className="mt-1 text-xs text-gray-500">
                                Available: {userBalance?.xeraBalance || '0.00'} XERA
                            </div>
                        </div>

                        {/* Total */}
                        {orderForm.amount && (
                            <div className="bg-gray-50 rounded-lg p-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Total:</span>
                                    <span className="font-medium">
                                        ₹{(parseFloat(orderForm.amount || 0) * parseFloat(xeraPrice?.currentPrice || 0)).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                                orderForm.type === 'buy'
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'bg-red-600 hover:bg-red-700 text-white'
                            }`}
                        >
                            {orderForm.type === 'buy' ? 'Buy XERA' : 'Sell XERA'}
                        </button>
                    </form>
                </div>

                {/* Portfolio Summary */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                        <Wallet className="h-5 w-5 mr-2" />
                        Your Portfolio
                    </h3>
                    
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                                <div className="font-medium">XERA Balance</div>
                                <div className="text-sm text-gray-500">Platform token</div>
                            </div>
                            <div className="text-right">
                                <div className="font-semibold">{userBalance?.xeraBalance || '0.00'}</div>
                                <div className="text-sm text// ============================================================================
// XERA TOKEN DASHBOARD COMPONENT
// ============================================================================

// frontend/src/components/XERA/XERADashboard.jsx
import React, { useState, useEffect } from 'react';
import { TrendingUp, Building2, MapPin, PieChart, Coins, Trophy } from 'lucide-react';
import tokenConfig from '../../config/tokenConfig.json';

const XERADashboard = () => {
    const [xeraData, setXeraData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedCity, setSelectedCity] = useState('ALL');

    useEffect(() => {
        loadXERAData();
    }, []);

    const loadXERAData = async () => {
        try {
            const response = await fetch('/api/smart-contracts/xera/info');
            const data = await response.json();
            setXeraData(data.data);
        } catch (error) {
            console.error('Failed to load XERA data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="animate-pulse space-y-6">
                <div className="h-32 bg-gray-200 rounded-lg"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* XERA Header */}
            <div 
                className="relative overflow-hidden rounded-2xl p-8 text-white"
                style={{
                    background: tokenConfig.tokens.xera.colors.gradient
                }}
            >
                <div className="relative z-10">
                    <div className="flex items-center space-x-4 mb-6">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                            <Coins className="h-8 w-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">{tokenConfig.tokens.xera.name}</h1>
                            <p className="text-white/80">Diversified Real Estate Investment</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white/10 rounded-lg p-4">
                            <div className="text-white/70 text-sm">Current NAV</div>
                            <div className="text-2xl font-bold">
                                ₹{xeraData?.netAssetValue || '0.00'}
                            </div>
                            <div className="text-green-300 text-sm flex items-center">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                +12.5% (24h)
                            </div>
                        </div>

                        <div className="bg-white/10 rounded-lg p-4">
                            <div className="text-white/70 text-sm">Total Properties</div>
                            <div className="text-2xl font-bold">
                                {xeraData?.totalProperties || '0'}
                            </div>
                            <div className="text-white/70 text-sm">Across 6 cities</div>
                        </div>

                        <div className="bg-white/10 rounded-lg p-4">
                            <div className="text-white/70 text-sm">Portfolio Value</div>
                            <div className="text-2xl font-bold">
                                ₹{xeraData?.totalProperty