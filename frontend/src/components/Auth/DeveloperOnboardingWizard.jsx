import React, { useState } from 'react';
import { CheckCircle, User, FileText, Shield, LayoutDashboard } from 'lucide-react';

const DeveloperOnboardingWizard = () => {
  const [step, setStep] = useState(1);
  const [kycData, setKycData] = useState({ companyName: '', registrationNumber: '' });
  const [documents, setDocuments] = useState({ titleDeed: null, approvals: null });

  const handleKycSubmit = (e) => {
    e.preventDefault();
    // Mock KYC submission (in production, integrate with DigiLocker)
    setKycData({ companyName: 'ABC Realty', registrationNumber: 'REG12345' });
    setStep(2);
  };

  const handleDocumentUpload = (e) => {
    e.preventDefault();
    // Mock document upload to IPFS (in production, integrate with Pinata)
    setDocuments({ titleDeed: { ipfsHash: 'QmHash1' }, approvals: { ipfsHash: 'QmHash2' } });
    setStep(3);
  };

  const handleComplianceCheck = () => {
    // Mock compliance check (RERA, SEBI)
    setStep(4);
  };

  const handleComplete = () => {
    // Redirect to developer dashboard
    window.location.href = '/developer-dashboard';
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-6 text-center">Developer Onboarding</h2>
      <div className="flex justify-between mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`flex-1 text-center ${step >= s ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              {s}
            </div>
            <p className="text-sm mt-2">
              {s === 1 ? 'KYC' : s === 2 ? 'Document Upload' : s === 3 ? 'Compliance Check' : 'Dashboard Access'}
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
              <label className="block text-sm font-medium text-gray-700">Company Name</label>
              <input
                type="text"
                value={kycData.companyName}
                onChange={(e) => setKycData({ ...kycData, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Registration Number</label>
              <input
                type="text"
                value={kycData.registrationNumber}
                onChange={(e) => setKycData({ ...kycData, registrationNumber: e.target.value })}
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
        <div>
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Upload Documents
          </h3>
          <form onSubmit={handleDocumentUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title Deed</label>
              <input
                type="file"
                onChange={(e) => setDocuments({ ...documents, titleDeed: e.target.files[0] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Approvals</label>
              <input
                type="file"
                onChange={(e) => setDocuments({ ...documents, approvals: e.target.files[0] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Upload Documents
            </button>
          </form>
        </div>
      )}

      {step === 3 && (
        <div className="text-center">
          <h3 className="text-lg font-medium mb-4 flex items-center justify-center">
            <Shield className="h-5 w-5 mr-2" />
            Compliance Check
          </h3>
          <p className="text-gray-600 mb-4">
            Your documents are being reviewed for RERA and SEBI compliance. This may take a few minutes.
          </p>
          <button
            onClick={handleComplianceCheck}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Proceed (Mocked for Beta)
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="text-center">
          <h3 className="text-lg font-medium mb-4 flex items-center justify-center">
            <LayoutDashboard className="h-5 w-5 mr-2" />
            Access Your Dashboard
          </h3>
          <p className="text-gray-600 mb-4">
            You’re all set! Access your developer dashboard to start tokenizing properties.
          </p>
          <button
            onClick={handleComplete}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
  );
};

export default DeveloperOnboardingWizard;