import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, CreditCard } from 'lucide-react';

const PaymentIntegration = ({ userId }) => {
  const [methods, setMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const response = await axios.get('/api/payment/methods', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMethods(response.data.methods);
      if (response.data.methods.length > 0) {
        setSelectedMethod(response.data.methods[0]);
      }
    } catch (err) {
      setError('Failed to fetch payment methods');
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!amount || !selectedMethod) {
      setError('Please enter an amount and select a payment method');
      return;
    }

    try {
      setLoading(true);
      setError('');

      let endpoint = `/api/payment/${selectedMethod.toLowerCase()}/deposit`;
      const response = await axios.post(endpoint, { amount, currency }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success) {
        const { session, transactionUrl } = response.data;
        if (session) {
          // Handle Stripe session (e.g., redirect to session URL)
          window.location.href = session.url;
        } else if (transactionUrl) {
          // Handle MoonPay/Ramp transaction URL
          window.location.href = transactionUrl;
        }
        setSuccess(`Deposit initiated via ${selectedMethod}`);
      }
    } catch (err) {
      setError('Deposit failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <DollarSign className="h-5 w-5 mr-2" />
        Deposit Funds
      </h2>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          {success}
        </div>
      )}
      <form onSubmit={handleDeposit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Method
          </label>
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {methods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
            step="0.01"
            min="0"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Currency
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="USD">USD</option>
            <option value="INR">INR</option>
            <option value="AED">AED</option>
            <option value="GBP">GBP</option>
            <option value="SGD">SGD</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <CreditCard className="h-4 w-4" />
          <span>{loading ? 'Processing...' : 'Deposit'}</span>
        </button>
      </form>
    </div>
  );
};

export default PaymentIntegration;