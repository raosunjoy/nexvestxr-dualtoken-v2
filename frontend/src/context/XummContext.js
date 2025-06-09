import React, { createContext, useState, useEffect } from 'react';
import { XummSdk } from 'xumm-sdk';

const XummContext = createContext();

const XummProvider = ({ children }) => {
  const [xumm, setXumm] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userAccount, setUserAccount] = useState(null);

  useEffect(() => {
    const initializeXumm = async () => {
      const xummSdk = new XummSdk(process.env.REACT_APP_XUMM_API_KEY);
      setXumm(xummSdk);

      xummSdk.on('ready', () => {
        console.log('Xumm SDK ready');
      });

      xummSdk.on('success', async () => {
        const account = await xummSdk.getAccount();
        setUserAccount(account);
        setIsConnected(true);
      });

      xummSdk.on('logout', () => {
        setUserAccount(null);
        setIsConnected(false);
      });
    };

    initializeXumm();
  }, []);

  const connectWallet = async () => {
    if (xumm) {
      await xumm.authorize();
    }
  };

  const createPayload = async (payload) => {
    if (xumm) {
      return await xumm.payload.createAndSubscribe(payload, (event) => {
        if (event.data.signed) {
          return event.data;
        }
      });
    }
  };

  return (
    <XummContext.Provider value={{ connectWallet, createPayload, isConnected, userAccount }}>
      {children}
    </XummContext.Provider>
  );
};

export { XummContext, XummProvider };