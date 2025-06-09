// src/screens/PropertyDetailsScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { styles } from '../styles';

const PropertyDetailsScreen = ({ navigation }) => {
  return (
    <ScrollView style={styles.container}>
      <View style={{ position: 'relative', height: 200, backgroundColor: '#1a1a2e', borderRadius: 20, marginBottom: 20 }}>
        <TouchableOpacity
          style={{ position: 'absolute', top: 15, left: 15, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 50, width: 35, height: 35, alignItems: 'center', justifyContent: 'center' }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: '#FFFFFF' }}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ position: 'absolute', top: 15, right: 15, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 50, width: 35, height: 35, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: '#FFFFFF' }}>❤️</Text>
        </TouchableOpacity>
        <Text style={{ position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -20 }, { translateY: -20 }], fontSize: 60 }}>🏢</Text>
        <View style={{ position: 'absolute', bottom: 15, left: 15, backgroundColor: 'rgba(6,214,160,0.9)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>🔥 Trending</Text>
        </View>
      </View>

      <Text style={[styles.text, { fontSize: 24, fontWeight: '800', marginBottom: 8 }]}>Manhattan Luxury Tower</Text>
      <Text style={[styles.secondaryText, { marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>📍 432 Park Avenue, New York, NY</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 25 }}>
        <View style={[styles.card, { width: '48%' }]}>
          <Text style={[styles.text, { fontSize: 20, fontWeight: '700', color: '#06d6a0', marginBottom: 4 }]}>8.2%</Text>
          <Text style={[styles.secondaryText, { fontSize: 12 }]}>Annual Yield</Text>
        </View>
        <View style={[styles.card, { width: '48%' }]}>
          <Text style={[styles.text, { fontSize: 20, fontWeight: '700', color: '#06d6a0', marginBottom: 4 }]}>$1,250</Text>
          <Text style={[styles.secondaryText, { fontSize: 12 }]}>Min Investment</Text>
        </View>
        <View style={[styles.card, { width: '48%', marginTop: 15 }]}>
          <Text style={[styles.text, { fontSize: 20, fontWeight: '700', color: '#06d6a0', marginBottom: 4 }]}>756</Text>
          <Text style={[styles.secondaryText, { fontSize: 12 }]}>Total Investors</Text>
        </View>
        <View style={[styles.card, { width: '48%', marginTop: 15 }]}>
          <Text style={[styles.text, { fontSize: 20, fontWeight: '700', color: '#06d6a0', marginBottom: 4 }]}>87%</Text>
          <Text style={[styles.secondaryText, { fontSize: 12 }]}>Funded</Text>
        </View>
      </View>

      <View style={[styles.card, { marginBottom: 20 }]}>
        <Text style={[styles.text, { fontSize: 16, fontWeight: '600', marginBottom: 12 }]}>About This Property</Text>
        <Text style={[styles.secondaryText, { fontSize: 14, lineHeight: 21 }]}>
          Prime Manhattan location with excellent rental yield and capital appreciation potential. Fully managed by professional property management company.
        </Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <TouchableOpacity style={[styles.button, { flex: 1, marginRight: 12 }]} onPress={() => navigation.navigate('Tokenize')}>
          <Text style={styles.buttonText}>Invest Now</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: '#1a1a2e' }]}>
          <Text style={[styles.buttonText, { color: '#06d6a0' }]}>Analytics</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default PropertyDetailsScreen;

