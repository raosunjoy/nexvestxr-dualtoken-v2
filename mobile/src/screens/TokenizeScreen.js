// src/screens/TokenizeScreen.js
import React, { useState, useContext, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, ActivityIndicator, Linking, Image } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { AuthContext } from '../utils/AuthContext';
import { styles } from '../styles';
import { createSignRequest, initializeXumm } from '../utils/xumm';
import { API_BASE_URL } from '@env';

const TokenizeScreen = () => {
  const [amount, setAmount] = useState('');
  const [signRequest, setSignRequest] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const { token } = useContext(AuthContext);

  useEffect(() => {
    if (token) {
      initializeXumm(token);
    }
  }, [token]);

  const handleTokenize = async () => {
    setLoading(true);
    try {
      const transaction = {
        TransactionType: 'Payment',
        Account: 'rUserAccount', // Placeholder; in production, fetch from XUMM
        Destination: 'rContractAccount', // Placeholder; contract account for minting
        Amount: (parseInt(amount) * 1000000).toString(), // XRPL uses drops
        Memos: [
          {
            Memo: {
              MemoData: Buffer.from(JSON.stringify({ action: 'mint', amount: parseInt(amount) })).toString('hex'),
            },
          },
        ],
      };

      const request = await createSignRequest(transaction);
      setSignRequest(request);
    } catch (error) {
      setResult({ success: false, error: error.message });
      setLoading(false);
    }
  };

  const handleOpenXUMM = () => {
    Linking.openURL(signRequest.next.always);
  };

  const handleCancel = () => {
    setSignRequest(null);
    setLoading(false);
  };

  useEffect(() => {
    if (signRequest) {
      const interval = setInterval(async () => {
        const status = await signRequest.payload.get();
        if (status.resolved) {
          clearInterval(interval);
          setLoading(false);
          if (status.signed) {
            setResult({ success: true, data: { transactionHash: status.txid } });
            await fetch(`${API_BASE_URL}/api/notifications/send`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                userId: 'testuser',
                message: `Tokens minted successfully! Transaction: ${status.txid}`,
              }),
            });
          } else {
            setResult({ success: false, error: 'Transaction signing rejected' });
          }
          setSignRequest(null);
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [signRequest]);

  return (
    <View style={styles.container}>
      {!signRequest && !result && (
        <>
          <TextInput
            placeholder="Amount of Tokens"
            placeholderTextColor="#F5F5F5"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            style={styles.input}
          />
          <TouchableOpacity style={styles.button} onPress={handleTokenize}>
            <Text style={styles.buttonText}>Mint Tokens</Text>
          </TouchableOpacity>
        </>
      )}
      {signRequest && (
        <>
          <Text style={styles.text}>Scan with XUMM Wallet to Sign Transaction</Text>
          <View style={{ marginVertical: 16 }}>
            <QRCode value={signRequest.next.always} size={200} backgroundColor="#0a0a1a" color="#FFFFFF" />
          </View>
          <TouchableOpacity style={styles.button} onPress={handleOpenXUMM}>
            <Text style={styles.buttonText}>Open XUMM</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCancel}>
            <Text style={[styles.secondaryText, { textAlign: 'center', marginTop: 16 }]}>Cancel</Text>
          </TouchableOpacity>
          {loading && <ActivityIndicator size="large" color="#06d6a0" />}
        </>
      )}
      {result && result.success && (
        <>
          <Text style={[styles.text, { fontWeight: 'bold' }]}>Tokens Minted Successfully!</Text>
          <Text style={styles.text}>Transaction Hash: {result.data.transactionHash}</Text>
          <TouchableOpacity style={styles.button} onPress={() => setResult(null)}>
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
        </>
      )}
      {result && !result.success && (
        <>
          <Text style={styles.text}>Transaction Failed: {result.error}</Text>
          <TouchableOpacity style={styles.button} onPress={() => setResult(null)}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

export default TokenizeScreen;

