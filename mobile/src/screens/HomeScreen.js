// src/screens/HomeScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { styles } from '../styles';

const HomeScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#06d6a0', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>JD</Text>
          </View>
          <View>
            <Text style={[styles.text, { fontWeight: '600', fontSize: 16 }]}>John Doe</Text>
            <Text style={[styles.secondaryText, { fontSize: 13 }]}>Portfolio: $42,580</Text>
          </View>
        </View>
        <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="notifications-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { borderColor: '#06d6a0' }]}>
        <Text style={[styles.text, { fontSize: 28, fontWeight: '800', marginBottom: 8 }]}>$42,580.32</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="trending-up-outline" size={14} color="#06d6a0" />
          <Text style={[styles.text, { fontSize: 14, fontWeight: '600', color: '#06d6a0' }]}>+$2,340 (+5.8%) Today</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 }}>
        <TouchableOpacity style={[styles.button, { backgroundColor: '#1a1a2e', flex: 1, marginRight: 12 }]} onPress={() => navigation.navigate('Deposit')}>
          <Icon name="cash-outline" size={24} color="#06d6a0" />
          <Text style={[styles.buttonText, { color: '#06d6a0' }]}>Buy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { backgroundColor: '#1a1a2e', flex: 1 }]} onPress={() => navigation.navigate('Trading')}>
          <Icon name="analytics-outline" size={24} color="#06d6a0" />
          <Text style={[styles.buttonText, { color: '#06d6a0' }]}>Trade</Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('PropertyDetails')}>
          <View style={{ width: '100%', height: 120, backgroundColor: '#1a1a2e', position: 'relative', borderRadius: 20 }}>
            <Text style={{ position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -20 }, { translateY: -20 }], fontSize: 40 }}>🏢</Text>
            <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(6,214,160,0.9)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>HOT</Text>
            </View>
          </View>
          <View style={{ padding: 15 }}>
            <Text style={[styles.text, { fontSize: 15, fontWeight: '600', marginBottom: 6 }]}>Manhattan Luxury Tower</Text>
            <Text style={[styles.secondaryText, { fontSize: 12, marginBottom: 10 }]}>📍 New York, NY</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.text, { fontSize: 16, fontWeight: '700', color: '#06d6a0' }]}>$1,250</Text>
              <Text style={[styles.text, { fontSize: 12, color: 'rgba(255,255,255,0.8)' }]}>8.2% APY</Text>
            </View>
          </View>
        </TouchableOpacity>
        {/* Add more property cards */}
      </ScrollView>
    </View>
  );
};

export default HomeScreen;

