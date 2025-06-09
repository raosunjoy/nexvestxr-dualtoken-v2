import React, { useEffect } from 'react';
import { MessageCircle } from 'lucide-react';

const IntercomChat = ({ user }) => {
  useEffect(() => {
    // Update Intercom with user info
    window.Intercom('update', {
      app_id: process.env.REACT_APP_INTERCOM_APP_ID,
      user_id: user?.id,
      email: user?.email,
      name: user?.name,
      role: user?.role,
    });

    // Show the Intercom messenger
    window.Intercom('show');
  }, [user]);

  return (
    <div className="fixed bottom-4 right-4">
      <button
        onClick={() => window.Intercom('show')}
        className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </div>
  );
};

export default IntercomChat;