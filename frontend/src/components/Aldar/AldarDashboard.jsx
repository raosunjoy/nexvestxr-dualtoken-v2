// AldarDashboard.jsx
// Main Aldar Properties themed dashboard component
import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity,
  Star,
  MapPin,
  Calendar,
  PieChart,
  BarChart3
} from 'lucide-react';
import AldarPropertyCard, { sampleAldarProperties } from './AldarPropertyCard';
import '../styles/aldar-theme.css';

const AldarDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [portfolioData, setPortfolioData] = useState({
    totalValue: 8640000,
    totalProperties: 127,
    totalInvestors: 15420,
    monthlyRevenue: 36200000,
    growth: {
      portfolio: 12.5,
      properties: 8,
      investors: 23,
      revenue: 15.8
    }
  });

  const [recentActivity, setRecentActivity] = useState([
    {
      id: 1,
      type: 'investment',
      property: 'Saadiyat Island Villa',
      investor: 'Ahmed Al Mansoori',
      amount: 250000,
      timestamp: '2 hours ago'
    },
    {
      id: 2,
      type: 'completion',
      property: 'Al Reem Island Tower',
      milestone: 'Phase 2 Construction',
      timestamp: '5 hours ago'
    },
    {
      id: 3,
      type: 'dividend',
      property: 'Yas Island Resort',
      amount: 45600,
      timestamp: '1 day ago'
    }
  ]);

  const formatCurrency = (amount) => {
    if (amount >= 1000000000) {
      return `AED ${(amount / 1000000000).toFixed(1)}B`;
    }
    if (amount >= 1000000) {
      return `AED ${(amount / 1000000).toFixed(1)}M`;
    }
    return `AED ${amount.toLocaleString()}`;
  };

  const StatCard = ({ title, value, growth, icon: Icon, trend = 'positive' }) => (
    <div className="aldar-metric-card">
      <div className="aldar-metric-header">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            trend === 'positive' ? 'bg-aldar-green-light' : 'bg-aldar-orange-light'
          }`}>
            <Icon size={20} className={`${
              trend === 'positive' ? 'text-aldar-green' : 'text-aldar-orange'
            }`} />
          </div>
          <h3 className="aldar-heading-sm">{title}</h3>
        </div>
        {growth && (
          <span className={`aldar-metric-trend ${trend}`}>
            {trend === 'positive' ? '+' : ''}{growth}%
          </span>
        )}
      </div>
      <div className="aldar-metric-value">{value}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-aldar-gray-50">
      {/* Aldar Header */}
      <header className="aldar-nav bg-white border-b border-aldar-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="aldar-logo-container">
                <div className="w-10 h-10 bg-aldar-black rounded-lg flex items-center justify-center">
                  <Building2 size={24} className="text-white" />
                </div>
                <div>
                  <div className="aldar-brand-text">Aldar Properties</div>
                  <div className="text-xs text-aldar-gray-600">Real Estate Platform</div>
                </div>
              </div>
            </div>
            
            <nav className="flex items-center gap-2">
              {[
                { id: 'overview', label: 'Overview', icon: Activity },
                { id: 'properties', label: 'Properties', icon: Building2 },
                { id: 'investors', label: 'Investors', icon: Users },
                { id: 'analytics', label: 'Analytics', icon: BarChart3 }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  className={`aldar-nav-item ${activeTab === id ? 'active' : ''}`}
                  onClick={() => setActiveTab(id)}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="aldar-heading-sm">Aldar Admin</div>
                <div className="text-sm text-aldar-gray-600">TIER 1 Developer</div>
              </div>
              <div className="w-10 h-10 bg-aldar-blue rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">AA</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Page Title */}
            <div>
              <h1 className="aldar-heading-xl mb-2">Portfolio Overview</h1>
              <p className="aldar-body-lg text-aldar-gray-600">
                Manage your Aldar Properties real estate investment platform
              </p>
            </div>

            {/* Key Metrics */}
            <div className="aldar-metrics-grid">
              <StatCard
                title="Portfolio Value"
                value={formatCurrency(portfolioData.totalValue)}
                growth={portfolioData.growth.portfolio}
                icon={DollarSign}
                trend="positive"
              />
              <StatCard
                title="Active Properties"
                value={portfolioData.totalProperties.toLocaleString()}
                growth={portfolioData.growth.properties}
                icon={Building2}
                trend="positive"
              />
              <StatCard
                title="Total Investors"
                value={portfolioData.totalInvestors.toLocaleString()}
                growth={portfolioData.growth.investors}
                icon={Users}
                trend="positive"
              />
              <StatCard
                title="Monthly Revenue"
                value={formatCurrency(portfolioData.monthlyRevenue)}
                growth={portfolioData.growth.revenue}
                icon={TrendingUp}
                trend="positive"
              />
            </div>

            {/* Recent Activity & Top Properties */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Activity */}
              <div className="aldar-card">
                <div className="aldar-card-header">
                  <h3 className="aldar-heading-md">Recent Activity</h3>
                </div>
                <div className="aldar-card-body">
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-aldar-gray-50">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.type === 'investment' ? 'bg-aldar-green' :
                          activity.type === 'completion' ? 'bg-aldar-blue' :
                          'bg-aldar-orange'
                        }`}></div>
                        <div className="flex-1">
                          <div className="aldar-body font-medium">
                            {activity.type === 'investment' && `${activity.investor} invested ${formatCurrency(activity.amount)}`}
                            {activity.type === 'completion' && `${activity.milestone} completed`}
                            {activity.type === 'dividend' && `Dividend payout: ${formatCurrency(activity.amount)}`}
                          </div>
                          <div className="aldar-body-sm text-aldar-gray-600">
                            {activity.property} • {activity.timestamp}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Performance Chart Placeholder */}
              <div className="aldar-card">
                <div className="aldar-card-header">
                  <h3 className="aldar-heading-md">Performance Analytics</h3>
                </div>
                <div className="aldar-card-body">
                  <div className="h-64 bg-aldar-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <PieChart size={48} className="text-aldar-gray-400 mx-auto mb-4" />
                      <div className="aldar-body text-aldar-gray-600">
                        Performance charts would be rendered here
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Properties Tab */}
        {activeTab === 'properties' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="aldar-heading-xl mb-2">Property Portfolio</h1>
                <p className="aldar-body-lg text-aldar-gray-600">
                  Manage your Aldar Properties investment opportunities
                </p>
              </div>
              <button className="btn-aldar-primary">
                <Building2 size={16} />
                Add Property
              </button>
            </div>

            {/* Property Filters */}
            <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-aldar-gray-200">
              <select className="aldar-select">
                <option>All Property Types</option>
                <option>Villa</option>
                <option>Apartment</option>
                <option>Commercial</option>
                <option>Resort</option>
              </select>
              <select className="aldar-select">
                <option>All Locations</option>
                <option>Saadiyat Island</option>
                <option>Al Reem Island</option>
                <option>Yas Island</option>
                <option>Corniche</option>
              </select>
              <select className="aldar-select">
                <option>All Status</option>
                <option>Available</option>
                <option>Limited</option>
                <option>Sold Out</option>
              </select>
            </div>

            {/* Property Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sampleAldarProperties.map((property) => (
                <AldarPropertyCard
                  key={property.id}
                  property={property}
                  badgeType={property.tier === 'HOT' ? 'hot' : property.tier === 'PREMIUM' ? 'premium' : 'tier1'}
                  onClick={(prop) => console.log('Property clicked:', prop)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Investors Tab */}
        {activeTab === 'investors' && (
          <div className="space-y-8">
            <div>
              <h1 className="aldar-heading-xl mb-2">Investor Management</h1>
              <p className="aldar-body-lg text-aldar-gray-600">
                Monitor and manage your property investors
              </p>
            </div>

            <div className="aldar-card">
              <div className="aldar-card-body">
                <div className="text-center py-12">
                  <Users size={48} className="text-aldar-gray-400 mx-auto mb-4" />
                  <div className="aldar-heading-md text-aldar-gray-600 mb-2">
                    Investor Management Dashboard
                  </div>
                  <div className="aldar-body text-aldar-gray-500">
                    Comprehensive investor analytics and management tools would be displayed here
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div>
              <h1 className="aldar-heading-xl mb-2">Portfolio Analytics</h1>
              <p className="aldar-body-lg text-aldar-gray-600">
                Deep insights into your property performance
              </p>
            </div>

            <div className="aldar-card">
              <div className="aldar-card-body">
                <div className="text-center py-12">
                  <BarChart3 size={48} className="text-aldar-gray-400 mx-auto mb-4" />
                  <div className="aldar-heading-md text-aldar-gray-600 mb-2">
                    Advanced Analytics Dashboard
                  </div>
                  <div className="aldar-body text-aldar-gray-500">
                    Detailed analytics, charts, and performance metrics would be rendered here
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AldarDashboard;