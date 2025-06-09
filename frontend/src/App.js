import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Dashboard from './components/Dashboard/Dashboard';
import DeveloperDashboard from './components/Dashboard/DeveloperDashboard';
import AdvancedTradingInterface from './components/Exchange/AdvancedTradingInterface';
import OnboardingWizard from './components/Auth/OnboardingWizard';
import DeveloperOnboardingWizard from './components/Auth/DeveloperOnboardingWizard';
import DualTokenDashboard from './components/DualToken/DualTokenDashboard';
import XERADashboard from './components/DualToken/XERADashboard';
import PROPXMarketplace from './components/DualToken/PROPXMarketplace';
import Header from './components/Header';
import { AuthProvider } from './context/AuthContext';
import { XummProvider } from './context/XummContext';

function App() {
  return (
    <AuthProvider>
      <XummProvider>
        <Router>
          <div className="min-h-screen bg-gray-100">
            <Header />
            <Switch>
              <Route exact path="/dashboard" component={Dashboard} />
              <Route path="/developer-dashboard" component={DeveloperDashboard} />
              <Route path="/trading" component={AdvancedTradingInterface} />
              <Route path="/onboarding" component={OnboardingWizard} />
              <Route path="/developer-onboarding" component={DeveloperOnboardingWizard} />
              <Route path="/dual-token" component={DualTokenDashboard} />
              <Route path="/xera" component={XERADashboard} />
              <Route path="/propx-marketplace" component={PROPXMarketplace} />
              <Route path="/" component={Dashboard} />
            </Switch>
          </div>
        </Router>
      </XummProvider>
    </AuthProvider>
  );
}

export default App;