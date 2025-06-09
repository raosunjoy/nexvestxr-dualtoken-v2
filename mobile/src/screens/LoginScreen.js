// src/screens/LoginScreen.js
import React, { useState, useContext } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { AuthContext } from '../utils/AuthContext';
import { styles } from '../styles';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);

  const handleLogin = async () => {
    const result = await login(email, password);
    if (result.token) {
      navigation.navigate('Main');
    } else {
      setError(result.error || 'Login failed');
    }
  };

  return (
    <View style={styles.container}>
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
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Log In</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={[styles.secondaryText, { textAlign: 'center', marginTop: 16 }]}>Register</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.text}>{error}</Text> : null}
    </View>
  );
};

export default LoginScreen;

