// src/screens/SplashScreen.js
import React, { useEffect } from 'react';
import { View, Text, Animated } from 'react-native';
import { styles } from '../styles';

const SplashScreen = ({ navigation }) => {
  const scale = new Animated.Value(1);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    setTimeout(() => navigation.replace('Login'), 3000);
  }, [navigation]);

  return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <Animated.View style={[styles.button, { width: 120, height: 120, borderRadius: 30, transform: [{ scale }] }]}>
        <Text style={{ fontSize: 48 }}>🏢</Text>
      </Animated.View>
      <Text style={[styles.text, { fontSize: 32, fontWeight: '800', marginTop: 30 }]}>NexVestXR</Text>
      <Text style={[styles.secondaryText, { fontSize: 16, fontWeight: '500' }]}>Real Estate Reimagined</Text>
    </View>
  );
};

export default SplashScreen;

