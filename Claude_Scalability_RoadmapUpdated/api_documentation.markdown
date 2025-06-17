# NexVestXR API Documentation

## Smart Contract Events

### REXAToken.sol
- **PropertyAdded**
  ```json
  {
    "propertyId": "uint256",
    "weight": "uint256",
    "ipfsHash": "string"
  }
  ```
- **ComplianceCheck**
  ```json
  {
    "user": "address",
    "transactionHash": "bytes32",
    "approved": "bool"
  }
  ```
- **KYCStatusUpdated**
  ```json
  {
    "user": "address",
    "verified": "bool"
  }
  ```

### Error Codes
- **400 Bad Request**: Invalid parameters or validation failure.
  ```json
  { "error": "Invalid order parameters", "details": "Amount cannot be negative" }
  ```
- **401 Unauthorized**: Missing or invalid JWT.
  ```json
  { "error": "Unauthorized" }
  ```
- **429 Too Many Requests**: Rate limit exceeded.
  ```json
  { "error": "Too many trading requests" }
  ```

## Endpoints
- **POST /api/trading/orders/limit**
  - Request:
    ```json
    {
      "pairId": "REXA/XRP",
      "side": "buy",
      "amount": 100,
      "price": 0.001234,
      "options": { "postOnly": false, "timeInForce": "GTC" }
    }
    ```
  - Response:
    ```json
    {
      "success": true,
      "data": { "order": { "id": "order_123", "pairId": "REXA/XRP", "side": "buy", "amount": 100, "price": 0.001234 } }
    }
    ```

<!-- Existing endpoints unchanged -->