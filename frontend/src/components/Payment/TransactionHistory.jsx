import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, ArrowUpCircle, ArrowDownCircle, Clock } from 'lucide-react';

const TransactionHistory = ({ userId }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTransactions();
  }, [userId]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/payment/transactions', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setTransactions(response.data.transactions || []);
    } catch (err) {
      setError('Failed to fetch transaction history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center text-gray-600">Loading transactions...</div>;
  }

  if (error) {
    return <div className="text-center text-red-600">{error}</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Transaction History</h2>
      {transactions.length === 0 ? (
        <p className="text-gray-500">No transactions yet.</p>
      ) : (
        <div className="space-y-4">
          {transactions.map((tx, index) => (
            <div key={index} className="flex items-center justify-between border-b py-2">
              <div className="flex items-center space-x-3">
                {tx.type === 'deposit' ? (
                  <ArrowUpCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <ArrowDownCircle className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {tx.type === 'deposit' ? 'Deposit' : 'Withdrawal'} - {tx.currency}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {new Date(tx.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-sm font-medium flex items-center">
                <DollarSign className="h-4 w-4 mr-1" />
                {tx.amount.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;