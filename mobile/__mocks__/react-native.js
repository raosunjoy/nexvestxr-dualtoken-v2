import { jest } from '@jest/globals';

// Mock React Native modules
const mockReactNative = {
  Platform: {
    OS: 'ios',
    select: jest.fn((platforms) => platforms.ios),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  Alert: {
    alert: jest.fn(),
  },
  ActivityIndicator: 'ActivityIndicator',
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  Modal: 'Modal',
  StyleSheet: {
    create: jest.fn((styles) => styles),
  },
  Animated: {
    Value: jest.fn(() => ({
      setValue: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    })),
    timing: jest.fn(() => ({
      start: jest.fn(),
    })),
    spring: jest.fn(() => ({
      start: jest.fn(),
    })),
    View: 'Animated.View',
  },
  SafeAreaView: 'SafeAreaView',
  NativeModules: {},
  NativeEventEmitter: jest.fn(() => ({
    addListener: jest.fn(),
    removeListener: jest.fn(),
  })),
};

// Mock AsyncStorage
mockReactNative.AsyncStorage = {
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
};

// Mock react-native-maps
mockReactNative.MapView = {
  default: 'MapView',
  Marker: 'Marker',
  Heatmap: 'Heatmap',
  PROVIDER_GOOGLE: 'google',
};

// Mock react-native-vector-icons
mockReactNative.Icon = 'Icon';

// Mock react-native-linear-gradient
mockReactNative.LinearGradient = 'LinearGradient';

// Mock react-native-safe-area-context
mockReactNative.SafeAreaProvider = 'SafeAreaProvider';
mockReactNative.useSafeAreaInsets = jest.fn(() => ({
  top: 44,
  bottom: 34,
  left: 0,
  right: 0,
}));

export default mockReactNative;