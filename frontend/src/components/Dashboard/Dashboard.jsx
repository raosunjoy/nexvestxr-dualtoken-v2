import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PaymentIntegration from '../Payment/PaymentIntegration.jsx';
import SubscriptionPlans from '../Subscription/SubscriptionPlans';
import TransactionHistory from '../Payment/TransactionHistory.jsx';
import IntercomChat from '../Support/IntercomChat';
import AnalyticsDashboard from './AnalyticsDashboard';

const Dashboard = () => {
  const [tokens, setTokens] = useState([]);
  const [property, setProperty] = useState({});
  const [currency, setCurrency] = useState('INR');
  const [rates, setRates] = useState({});
  const [userId, setUserId] = useState('mock-user-id'); // Replace with actual user ID from auth context
  const [user, setUser] = useState({ id: 'mock-user-id', email: 'mock-user@example.com', name: 'Mock User', role: 'investor' });

  useEffect(() => {
    // Mock API responses (replace with actual endpoints)
    setTokens([{ id: '1', code: 'JVCOIMB789', amount: 50 }]);
    setProperty({ id: 'coimbatore_jv_789', location: 'Coimbatore', value: 500000000 });

    // Fetch exchange rates
    axios.get('https://api.coinbase.com/v2/exchange-rates?currency=INR')
      .then(response => setRates(response.data.data.rates))
      .catch(error => console.error(error));
  }, []);

  const handleCurrencyChange = (e) => {
    setCurrency(e.target.value);
  };

  const convertValue = (inrValue) => {
    if (currency === 'INR' || !rates[currency]) return inrValue;
    return (inrValue / rates[currency]).toFixed(2);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Investor Dashboard</h1>
      <select onChange={handleCurrencyChange} className="mb-4 p-2 border rounded">
        <option value="INR">INR</option>
        <option value="USD">USD</option>
        <option value="AED">AED</option>
        <option value="GBP">GBP</option>
        <option value="SGD">SGD</option>
      </select>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <h2 className="text-xl font-medium">Token Holdings</h2>
          <ul>
            {tokens.map(token => (
              <li key={token.id}>{token.code}: {token.amount} tokens ({convertValue(token.amount * 1000)} {currency})</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-xl font-medium">Property Details</h2>
          <p>ID: {property.id}</p>
          <p>Location: {property.location}</p>
          <p>Value: {convertValue(property.value)} {currency}</p>
        </div>
      </div>
      <AnalyticsDashboard userId={userId} />
      <PaymentIntegration userId={userId} />
      <SubscriptionPlans role="investor" userId={userId} />
      <TransactionHistory userId={userId} />
      <IntercomChat user={user} />
    </div>
  );
};

export default Dashboard;
