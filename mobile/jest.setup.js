import 'react-native-gesture-handler/jestSetup';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  SECURITY_LEVEL: {},
  ACCESSIBLE: {},
  ACCESS_CONTROL: {},
  AUTHENTICATION_TYPE: {},
  BIOMETRY_TYPE: {},
  setInternetCredentials: jest.fn().mockResolvedValue(true),
  getInternetCredentials: jest.fn().mockResolvedValue({ username: 'user', password: 'pass' }),
  resetInternetCredentials: jest.fn().mockResolvedValue(true),
  canImplyAuthentication: jest.fn().mockResolvedValue(true),
  getSupportedBiometryType: jest.fn().mockResolvedValue('FaceID'),
}));

// Mock react-native-biometrics
jest.mock('react-native-biometrics', () => ({
  default: jest.fn().mockImplementation(() => ({
    isSensorAvailable: jest.fn().mockResolvedValue({ available: true, biometryType: 'FaceID' }),
    biometricKeysExist: jest.fn().mockResolvedValue({ keysExist: false }),
    createKeys: jest.fn().mockResolvedValue({ publicKey: 'mockPublicKey' }),
    deleteKeys: jest.fn().mockResolvedValue(true),
    simplePrompt: jest.fn().mockResolvedValue({ success: true }),
  })),
}));

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

// Mock Linking
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  canOpenURL: jest.fn().mockResolvedValue(true),
  openURL: jest.fn().mockResolvedValue(true),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock Clipboard
jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
  getString: jest.fn().mockResolvedValue(''),
}));

// Mock XUMM SDK
jest.mock('xumm-sdk', () => ({
  XummSdk: jest.fn().mockImplementation(() => ({
    ping: jest.fn().mockResolvedValue({ pong: true }),
    payload: {
      create: jest.fn().mockResolvedValue({
        uuid: 'mock-uuid',
        next: { always: 'https://xumm.app/mock' },
        refs: { qr_uri: 'https://xumm.app/mock-qr' },
      }),
      get: jest.fn().mockResolvedValue({
        meta: { resolved: true },
        response: { signed: true, account: 'rMockAccount' },
      }),
    },
    storage: {
      account: {
        get: jest.fn().mockResolvedValue({ account: 'rMockAccount', balance: '1000000000' }),
      },
    },
  })),
}));

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  default: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
  })),
}));

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    providers: {
      JsonRpcProvider: jest.fn().mockImplementation(() => ({
        getNetwork: jest.fn().mockResolvedValue({ chainId: 14, name: 'flare' }),
        getBalance: jest.fn().mockResolvedValue('1000000000000000000'),
      })),
    },
    Wallet: jest.fn().mockImplementation(() => ({
      getAddress: jest.fn().mockResolvedValue('0xMockAddress'),
    })),
    Contract: jest.fn().mockImplementation(() => ({
      estimateGas: { transfer: jest.fn().mockResolvedValue('21000') },
      transfer: jest.fn().mockResolvedValue({ hash: '0xMockTxHash', wait: jest.fn().mockResolvedValue({ transactionHash: '0xMockTxHash' }) }),
    })),
    utils: {
      formatEther: jest.fn().mockReturnValue('1.0'),
      parseUnits: jest.fn().mockReturnValue('1000000000000000000'),
      formatUnits: jest.fn().mockReturnValue('1.0'),
      isAddress: jest.fn().mockReturnValue(true),
    },
  },
}));

// Mock crypto-js
jest.mock('crypto-js', () => ({
  AES: {
    encrypt: jest.fn().mockReturnValue({ toString: () => 'encrypted' }),
    decrypt: jest.fn().mockReturnValue({ toString: () => 'decrypted' }),
  },
  enc: {
    Utf8: {},
  },
}));

// Silence the warning about React.createFactory being deprecated
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning: React.createFactory is deprecated')) {
      return;
    }
    return originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});