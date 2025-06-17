// src/screens/AldarHomeScreen.js
// Aldar Properties themed home screen
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { aldarStyles, aldarColors } from '../styles/aldar-mobile-theme';

const AldarHomeScreen = ({ navigation }) => {
  return (
    <View style={aldarStyles.container}>
      {/* Aldar Header */}
      <View style={[aldarStyles.header, { marginBottom: 24 }]}>
        <View style={aldarStyles.rowBetween}>
          <View style={aldarStyles.row}>
            {/* Aldar User Avatar */}
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: aldarColors.blue,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
              ...aldarStyles.shadow
            }}>
              <Text style={{ 
                fontSize: 18, 
                fontFamily: 'Poppins-Bold',
                color: aldarColors.white 
              }}>AM</Text>
            </View>
            <View>
              <Text style={[aldarStyles.headingSM, { marginBottom: 2 }]}>Ahmed Al Mansoori</Text>
              <Text style={aldarStyles.bodySM}>Portfolio: AED 156,420</Text>
            </View>
          </View>
          <TouchableOpacity style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: aldarColors.gray100,
            borderWidth: 1,
            borderColor: aldarColors.gray200,
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon name="notifications-outline" size={20} color={aldarColors.gray600} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Aldar Portfolio Card */}
      <View style={[aldarStyles.propertyCard, { 
        backgroundColor: aldarColors.white,
        borderLeftWidth: 4,
        borderLeftColor: aldarColors.blue,
        marginBottom: 24 
      }]}>
        <View style={aldarStyles.propertyCardHeader} />
        <View style={aldarStyles.cardBody}>
          <Text style={[aldarStyles.headingLG, { 
            color: aldarColors.black,
            marginBottom: 8 
          }]}>AED 156,420.50</Text>
          <View style={aldarStyles.row}>
            <Icon name="trending-up-outline" size={16} color={aldarColors.green} />
            <Text style={[aldarStyles.bodyLG, { 
              color: aldarColors.green,
              fontFamily: 'Poppins-SemiBold',
              marginLeft: 6 
            }]}>+AED 8,640 (+5.9%) Today</Text>
          </View>
          <Text style={[aldarStyles.bodySM, { marginTop: 8 }]}>
            Powered by Aldar Properties
          </Text>
        </View>
      </View>

      {/* Aldar Action Buttons */}
      <View style={[aldarStyles.rowBetween, { marginBottom: 24 }]}>
        <TouchableOpacity 
          style={[aldarStyles.buttonBlue, { flex: 1, marginRight: 8 }]} 
          onPress={() => navigation.navigate('Invest')}
        >
          <Icon name="home-outline" size={20} color={aldarColors.white} />
          <Text style={aldarStyles.buttonTextPrimary}>Invest</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[aldarStyles.buttonSecondary, { flex: 1, marginLeft: 8 }]} 
          onPress={() => navigation.navigate('Trading')}
        >
          <Icon name="analytics-outline" size={20} color={aldarColors.black} />
          <Text style={aldarStyles.buttonTextSecondary}>Trade PROPX</Text>
        </TouchableOpacity>
      </View>

      {/* Aldar Properties Featured Section */}
      <Text style={[aldarStyles.headingMD, { marginBottom: 16 }]}>
        Featured Aldar Properties
      </Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Saadiyat Island Villa */}
        <TouchableOpacity 
          style={[aldarStyles.propertyCard, { marginBottom: 16 }]} 
          onPress={() => navigation.navigate('PropertyDetails')}
        >
          <View style={aldarStyles.propertyCardGradientHeader} />
          <View style={{
            width: '100%',
            height: 140,
            backgroundColor: aldarColors.gray100,
            borderRadius: 12,
            position: 'relative',
            marginBottom: 16,
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Text style={{ fontSize: 48 }}>🏖️</Text>
            <View style={{
              position: 'absolute',
              top: 12,
              right: 12,
              backgroundColor: aldarColors.blue,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 12
            }}>
              <Text style={{ 
                color: aldarColors.white, 
                fontSize: 11, 
                fontFamily: 'Poppins-SemiBold'
              }}>TIER 1</Text>
            </View>
          </View>
          <View style={aldarStyles.cardBody}>
            <Text style={aldarStyles.propertyDeveloper}>ALDAR PROPERTIES</Text>
            <Text style={[aldarStyles.headingSM, { marginBottom: 4 }]}>
              Saadiyat Island Villa
            </Text>
            <Text style={[aldarStyles.propertyLocation, { marginBottom: 12 }]}>
              📍 Saadiyat Island, Abu Dhabi
            </Text>
            <View style={aldarStyles.rowBetween}>
              <Text style={aldarStyles.propertyPrice}>AED 2.4M</Text>
              <Text style={[aldarStyles.bodySM, { color: aldarColors.green }]}>
                12.5% Annual Return
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Al Reem Island Apartment */}
        <TouchableOpacity 
          style={[aldarStyles.propertyCard, { marginBottom: 16 }]} 
          onPress={() => navigation.navigate('PropertyDetails')}
        >
          <View style={aldarStyles.propertyCardGradientHeader} />
          <View style={{
            width: '100%',
            height: 140,
            backgroundColor: aldarColors.gray100,
            borderRadius: 12,
            position: 'relative',
            marginBottom: 16,
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Text style={{ fontSize: 48 }}>🏙️</Text>
            <View style={{
              position: 'absolute',
              top: 12,
              right: 12,
              backgroundColor: aldarColors.green,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 12
            }}>
              <Text style={{ 
                color: aldarColors.white, 
                fontSize: 11, 
                fontFamily: 'Poppins-SemiBold'
              }}>AVAILABLE</Text>
            </View>
          </View>
          <View style={aldarStyles.cardBody}>
            <Text style={aldarStyles.propertyDeveloper}>ALDAR PROPERTIES</Text>
            <Text style={[aldarStyles.headingSM, { marginBottom: 4 }]}>
              Al Reem Island Tower
            </Text>
            <Text style={[aldarStyles.propertyLocation, { marginBottom: 12 }]}>
              📍 Al Reem Island, Abu Dhabi
            </Text>
            <View style={aldarStyles.rowBetween}>
              <Text style={aldarStyles.propertyPrice}>AED 890K</Text>
              <Text style={[aldarStyles.bodySM, { color: aldarColors.green }]}>
                10.8% Annual Return
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Yas Island Development */}
        <TouchableOpacity 
          style={[aldarStyles.propertyCard, { marginBottom: 16 }]} 
          onPress={() => navigation.navigate('PropertyDetails')}
        >
          <View style={aldarStyles.propertyCardGradientHeader} />
          <View style={{
            width: '100%',
            height: 140,
            backgroundColor: aldarColors.gray100,
            borderRadius: 12,
            position: 'relative',
            marginBottom: 16,
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Text style={{ fontSize: 48 }}>🎢</Text>
            <View style={{
              position: 'absolute',
              top: 12,
              right: 12,
              backgroundColor: aldarColors.orange,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 12
            }}>
              <Text style={{ 
                color: aldarColors.white, 
                fontSize: 11, 
                fontFamily: 'Poppins-SemiBold'
              }}>HOT</Text>
            </View>
          </View>
          <View style={aldarStyles.cardBody}>
            <Text style={aldarStyles.propertyDeveloper}>ALDAR PROPERTIES</Text>
            <Text style={[aldarStyles.headingSM, { marginBottom: 4 }]}>
              Yas Island Resort
            </Text>
            <Text style={[aldarStyles.propertyLocation, { marginBottom: 12 }]}>
              📍 Yas Island, Abu Dhabi
            </Text>
            <View style={aldarStyles.rowBetween}>
              <Text style={aldarStyles.propertyPrice}>AED 1.8M</Text>
              <Text style={[aldarStyles.bodySM, { color: aldarColors.green }]}>
                15.2% Annual Return
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Corniche Residence */}
        <TouchableOpacity 
          style={[aldarStyles.propertyCard, { marginBottom: 16 }]} 
          onPress={() => navigation.navigate('PropertyDetails')}
        >
          <View style={aldarStyles.propertyCardGradientHeader} />
          <View style={{
            width: '100%',
            height: 140,
            backgroundColor: aldarColors.gray100,
            borderRadius: 12,
            position: 'relative',
            marginBottom: 16,
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Text style={{ fontSize: 48 }}>🌊</Text>
            <View style={{
              position: 'absolute',
              top: 12,
              right: 12,
              backgroundColor: aldarColors.purple,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 12
            }}>
              <Text style={{ 
                color: aldarColors.white, 
                fontSize: 11, 
                fontFamily: 'Poppins-SemiBold'
              }}>PREMIUM</Text>
            </View>
          </View>
          <View style={aldarStyles.cardBody}>
            <Text style={aldarStyles.propertyDeveloper}>ALDAR PROPERTIES</Text>
            <Text style={[aldarStyles.headingSM, { marginBottom: 4 }]}>
              Corniche Residence
            </Text>
            <Text style={[aldarStyles.propertyLocation, { marginBottom: 12 }]}>
              📍 Corniche, Abu Dhabi
            </Text>
            <View style={aldarStyles.rowBetween}>
              <Text style={aldarStyles.propertyPrice}>AED 3.2M</Text>
              <Text style={[aldarStyles.bodySM, { color: aldarColors.green }]}>
                14.7% Annual Return
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

export default AldarHomeScreen;