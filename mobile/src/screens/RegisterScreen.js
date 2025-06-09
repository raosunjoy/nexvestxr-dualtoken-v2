// src/screens/RegisterScreen.js
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { styles } from '../styles';
import { API_BASE_URL } from '@env';

const RegisterScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async () => {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await response.json();
    if (data.message === 'User registered successfully') {
      navigation.navigate('Login');
    } else {
      setError(data.error || 'Registration failed');
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Username"
        placeholderTextColor="#F5F5F5"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
      />
      <TextInput
        placeholder="Email"
        placeholderTextColor="#F5F5F5"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        placeholderTextColor="#F5F5F5"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={[styles.secondaryText, { textAlign: 'center', marginTop: 16 }]}>Back to Login</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.text}>{error}</Text> : null}
    </View>
  );
};

export default RegisterScreen;

