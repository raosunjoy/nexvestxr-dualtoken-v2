// mobile/src/utils/xumm.js
import { Xumm } from 'xumm';
import { API_BASE_URL } from '@env';

let xummInstance = null;

export const initializeXumm = async (token) => {
  const response = await fetch(`${API_BASE_URL}/api/xumm/credentials`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const { apiKey, apiSecret } = await response.json();
  xummInstance = new Xumm(apiKey, apiSecret);
};

export const createSignRequest = async (transaction) => {
  if (!xummInstance) throw new Error('XUMM not initialized');
  const payload = {
    txjson: transaction,
    options: {
      submit: false,
      expire: 15,
      return_url: {
        app: 'nexvestxr://sign-callback',
        web: 'https://api.nexvestxr.com/sign-callback',
      },
    },
  };
  return await xummInstance.payload.create(payload);
};

export default () => xummInstance;

