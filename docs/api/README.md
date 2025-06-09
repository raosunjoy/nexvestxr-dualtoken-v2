# NexVestXR API Documentation

This directory contains resources for interacting with the NexVestXR API.

## Postman Collection
The `PostmanCollection.json` file provides a pre-configured Postman collection for testing the API endpoints. Import this file into Postman to get started.

### Steps to Use
1. Open Postman.
2. Click **Import** > **File** and select `PostmanCollection.json`.
3. Set the `API_URL` variable in the collection to your API base URL (e.g., `http://localhost:3000` or `https://api.nexvestxr.com`).
4. Obtain a JWT token by registering or logging in via the **Auth** folder endpoints.
5. Set the `token` variable in the collection with the obtained JWT.
6. Test the endpoints under the **Auth**, **Trading**, and **Payment** folders.

## API Endpoints Overview
- **Auth**: Register, login, and generate API keys for Institutional plan users.
- **Trading**: Create limit orders, add liquidity to pools, and manage trades.
- **Payment**: Deposit funds via Stripe, MoonPay, or Razorpay.

For detailed endpoint documentation, visit `/api-docs` on your deployed API server (e.g., `http://localhost:3000/api-docs`).