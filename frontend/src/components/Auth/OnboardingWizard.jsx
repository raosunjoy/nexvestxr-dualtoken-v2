import React, { useState, useContext } from 'react';
import { XummContext } from '../../context/XummContext';
import QRCode from 'qrcode.react';
import { CheckCircle, User, Wallet, CreditCard, TrendingUp } from 'lucide-react';

const OnboardingWizard = () => {
  const { connectWallet, isConnected, userAccount } = useContext(XummContext);
  const [step, setStep] = useState(1);
  const [kycData, setKycData] = useState({ name: '', nationality: '' });

  const handleKycSubmit = (e) => {
    e.preventDefault();
    // Mock KYC submission (in production, integrate with DigiLocker/MyInfo)
    setKycData({ name: 'John Doe', nationality: 'IN' });
    setStep(2);
  };

  const handleWalletConnect = async () => {
    try {
      await connectWallet();
      setStep(3);
    } catch (err) {
      console.error('Wallet connection failed:', err);
    }
  };

  const handlePaymentTutorialComplete = () => {
    setStep(4);
  };

  const handleFirstTrade = () => {
    // Redirect to trading interface with a 0.25% fee discount for first trade
    window.location.href = '/trading?firstTradeDiscount=true';
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-6 text-center">Welcome to NexVestXR</h2>
      <div className="flex justify-between mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`flex-1 text-center ${step >= s ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              {s}
            </div>
            <p className="text-sm mt-2">
              {s === 1 ? 'KYC' : s === 2 ? 'Wallet Setup' : s === 3 ? 'Payment Tutorial' : 'First Trade'}
            </p>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div>
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Complete KYC
          </h3>
          <form onSubmit={handleKycSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={kycData.name}
                onChange={(e) => setKycData({ ...kycData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nationality</label>
              <input
                type="text"
                value={kycData.nationality}
                onChange={(e) => setKycData({ ...kycData, nationality: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Submit KYC
            </button>
          </form>
        </div>
      )}

      {step === 2 && (
        <div className="text-center">
          <h3 className="text-lg font-medium mb-4 flex items-center justify-center">
            <Wallet className="h-5 w-5 mr-2" />
            Connect Your XUMM Wallet
          </h3>
          {!isConnected ? (
            <>
              <QRCode value="https://xumm.app/detect/xapp:nexvestxr" size={200} className="mx-auto mb-4" />
              <button
                onClick={handleWalletConnect}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Connect Wallet
              </button>
            </>
          ) : (
            <div>
              <p className="text-green-600 flex items-center justify-center mb-4">
                <CheckCircle className="h-5 w-5 mr-2" />
                Wallet Connected: {userAccount.slice(0, 6)}...{userAccount.slice(-4)}
              </p>
              <button
                onClick={() => setStep(3)}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div>
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Payment Tutorial
          </h3>
          <p className="text-gray-600 mb-4">
            Learn how to deposit funds using Stripe, MoonPay, or Ramp. A 0.25% fee discount will be applied to your first trade after completing this step.
          </p>
          <button
            onClick={handlePaymentTutorialComplete}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Complete Tutorial
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="text-center">
          <h3 className="text-lg font-medium mb-4 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Make Your First Trade
          </h3>
          <p className="text-gray-600 mb-4">
            Start trading with a 0.25% fee discount on your first trade!
          </p>
          <button
            onClick={handleFirstTrade}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start Trading
          </button>
        </div>
      )}
    </div>
  );
};

export default OnboardingWizard;