import React, { Suspense } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { RTLProvider } from './hooks/useRTL';
import LanguageSwitcher from './components/Common/LanguageSwitcher';
import LoadingSpinner from './components/Common/LoadingSpinner';

// Import i18n configuration
import './i18n';

// Loading component for i18n
const AppLoading = () => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center">
    <LoadingSpinner />
  </div>
);

function App() {
  const { t, i18n } = useTranslation();

  return (
    <Suspense fallback={<AppLoading />}>
      <RTLProvider>
        <AuthProvider>
          <XummProvider>
            <Router>
              <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
                {/* Language Switcher - Fixed Position */}
                <div className="fixed top-4 right-4 z-50">
                  <LanguageSwitcher />
                </div>

                <Header />
                
                {/* Main Content with RTL Support */}
                <main className="transition-all duration-300 ease-in-out">
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
                </main>
              </div>
            </Router>
          </XummProvider>
        </AuthProvider>
      </RTLProvider>
    </Suspense>
  );
}

export default App;