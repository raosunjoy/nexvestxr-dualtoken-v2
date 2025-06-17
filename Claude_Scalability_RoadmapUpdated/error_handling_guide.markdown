# Frontend Error Handling Guide

## XRPL Transaction Failures
- **Error**: Insufficient balance
  - **Display**: "Your wallet has insufficient XRP to complete this transaction."
  - **Action**: Prompt user to top up wallet via MoonPay integration.
  ```javascript
  if (error.message.includes('Insufficient balance')) {
    alert('Your wallet has insufficient XRP. Please top up your wallet.');
    navigate('/wallet/topup');
  }
  ```

- **Error**: Transaction reverted
  - **Display**: "Transaction failed due to network issues. Please try again."
  - **Action**: Retry transaction with exponential backoff.
  ```javascript
  const retryTransaction = async (tx, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await signTransaction(tx);
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  };
  ```

## Flare Contract Failures
- **Error**: KYC not verified
  - **Display**: "Please complete KYC verification to proceed."
  - **Action**: Redirect to KYC page.
  ```javascript
  if (error.message.includes('KYC not verified')) {
    alert('Please complete KYC verification to proceed.');
    navigate('/profile/kyc');
  }
  ```

## Network Timeouts
- **Error**: API timeout
  - **Display**: "Network request timed out. Please check your connection."
  - **Action**: Show retry button.
  ```javascript
  const { data, error, refetch } = useQuery({
    queryKey: ['orderbook', pairId],
    queryFn: () => getOrderBook(pairId),
    retry: 3,
    retryDelay: attempt => attempt * 1000
  });
  if (error) {
    return (
      <div>
        <p>Network request timed out. Please check your connection.</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }
  ```