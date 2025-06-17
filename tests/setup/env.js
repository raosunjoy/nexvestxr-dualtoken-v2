// Test environment setup
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-uae-platform';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';
process.env.DATABASE_URL = 'mongodb://localhost:27017/nexvestxr_uae_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.PORT = '3001';

// UAE-specific test environment variables
process.env.RERA_COMPLIANCE_ADDRESS = '0x1234567890123456789012345678901234567890';
process.env.DLD_REGISTRY_ADDRESS = '0x0987654321098765432109876543210987654321';
process.env.UAE_CURRENCY_API_KEY = 'test-currency-api-key';
process.env.KYC_PROVIDER_API_KEY = 'test-kyc-provider-key';
process.env.AML_PROVIDER_API_KEY = 'test-aml-provider-key';

// Blockchain test configuration
process.env.HARDHAT_NETWORK = 'localhost';
process.env.PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
process.env.CONTRACT_ADDRESS_UAE_PROPERTY = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
process.env.CONTRACT_ADDRESS_UAE_COMPLIANCE = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';

// File upload and storage
process.env.AWS_ACCESS_KEY_ID = 'test-aws-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-aws-secret-key';
process.env.AWS_REGION = 'me-south-1'; // Middle East (Bahrain) for UAE
process.env.S3_BUCKET_NAME = 'nexvestxr-uae-test-bucket';
process.env.CLOUDFRONT_DOMAIN = 'https://test-cdn.propexchange.ae';

// External service mocks
process.env.MOCK_EXTERNAL_SERVICES = 'true';
process.env.MOCK_BLOCKCHAIN = 'true';
process.env.MOCK_FILE_UPLOADS = 'true';
process.env.MOCK_CURRENCY_API = 'true';
process.env.MOCK_KYC_PROVIDER = 'true';
process.env.MOCK_AML_PROVIDER = 'true';

// Performance test settings
process.env.LOAD_TEST_CONCURRENT_USERS = '100';
process.env.LOAD_TEST_DURATION = '30';
process.env.PERFORMANCE_THRESHOLD_MS = '2000';

// Security test settings
process.env.ENABLE_SECURITY_HEADERS = 'true';
process.env.ENABLE_RATE_LIMITING = 'true';
process.env.MAX_LOGIN_ATTEMPTS = '5';
process.env.LOCKOUT_DURATION = '300';

// Notification services
process.env.DISABLE_NOTIFICATIONS = 'true';
process.env.MOCK_SMS_SERVICE = 'true';
process.env.MOCK_EMAIL_SERVICE = 'true';
process.env.MOCK_PUSH_NOTIFICATIONS = 'true';

// Logging configuration
process.env.LOG_LEVEL = 'error';
process.env.DISABLE_REQUEST_LOGGING = 'true';

console.log('🧪 Test environment configured for UAE platform testing');