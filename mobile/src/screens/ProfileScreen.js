import React, {useState, useContext} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  SafeAreaView,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {AuthContext} from '../utils/AuthContext';
import { styles as globalStyles, colors } from '../styles';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const {user, setUser} = useContext(AuthContext);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
  });

  const userStats = {
    totalInvestment: 125000,
    properties: 8,
    monthlyIncome: 890,
    portfolioGrowth: '+12.5%',
  };

  const menuItems = [
    {
      title: 'Account Information',
      icon: '👤',
      onPress: () => setShowEditModal(true),
    },
    {
      title: 'Investment History',
      icon: '📊',
      onPress: () => Alert.alert('Feature', 'Investment history coming soon'),
    },
    {
      title: 'Tax Documents',
      icon: '📄',
      onPress: () => Alert.alert('Feature', 'Tax documents coming soon'),
    },
    {
      title: 'KYC Verification',
      icon: '🛡️',
      onPress: () => Alert.alert('Feature', 'KYC verification coming soon'),
    },
    {
      title: 'Help & Support',
      icon: '❓',
      onPress: () => Alert.alert('Support', 'Contact support at support@nexvestxr.com'),
    },
    {
      title: 'Terms of Service',
      icon: '📋',
      onPress: () => Alert.alert('Legal', 'Terms of service'),
    },
    {
      title: 'Privacy Policy',
      icon: '🔒',
      onPress: () => Alert.alert('Legal', 'Privacy policy'),
    },
  ];

  const handleSaveProfile = () => {
    setShowEditModal(false);
    Alert.alert('Success', 'Profile updated successfully');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Logout', style: 'destructive', onPress: () => {
          setUser(null);
          navigation.reset({
            index: 0,
            routes: [{name: 'Login'}],
          });
        }}
      ]
    );
  };

  const renderMenuItem = (item, index) => (
    <TouchableOpacity
      key={index}
      style={styles.menuItem}
      onPress={item.onPress}>
      <View style={styles.menuItemLeft}>
        <Text style={styles.menuIcon}>{item.icon}</Text>
        <Text style={styles.menuTitle}>{item.title}</Text>
      </View>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={globalStyles.container}>
      <ScrollView style={globalStyles.scrollContainer}>
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>JD</Text>
            </View>
            <Text style={styles.userName}>John Doe</Text>
            <Text style={styles.userEmail}>john.doe@example.com</Text>
            <Text style={styles.walletAddress}>
              {user?.address ? `${user.address.slice(0, 8)}...${user.address.slice(-6)}` : 'Wallet not connected'}
            </Text>
          </View>
        </View>

        <View style={globalStyles.card}>
          <Text style={globalStyles.subtitle}>Investment Summary</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{userStats.totalInvestment.toLocaleString()} XRP</Text>
              <Text style={styles.statLabel}>Total Investment</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{userStats.properties}</Text>
              <Text style={styles.statLabel}>Properties</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{userStats.monthlyIncome} XRP</Text>
              <Text style={styles.statLabel}>Monthly Income</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, styles.positiveValue]}>{userStats.portfolioGrowth}</Text>
              <Text style={styles.statLabel}>Portfolio Growth</Text>
            </View>
          </View>
        </View>

        <View style={globalStyles.card}>
          <Text style={globalStyles.subtitle}>Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🔔</Text>
              <Text style={styles.settingTitle}>Push Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{false: colors.border, true: colors.accent}}
              thumbColor={notificationsEnabled ? colors.text : colors.textMuted}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>👆</Text>
              <Text style={styles.settingTitle}>Biometric Login</Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={setBiometricEnabled}
              trackColor={{false: colors.border, true: colors.accent}}
              thumbColor={biometricEnabled ? colors.text : colors.textMuted}
            />
          </View>
        </View>

        <View style={globalStyles.card}>
          <Text style={globalStyles.subtitle}>Account</Text>
          {menuItems.map(renderMenuItem)}
        </View>

        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={showEditModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowEditModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.firstName}
                  onChangeText={(value) => setEditForm({...editForm, firstName: value})}
                  placeholder="First Name"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.lastName}
                  onChangeText={(value) => setEditForm({...editForm, lastName: value})}
                  placeholder="Last Name"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.email}
                  onChangeText={(value) => setEditForm({...editForm, email: value})}
                  placeholder="Email"
                  keyboardType="email-address"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.phone}
                  onChangeText={(value) => setEditForm({...editForm, phone: value})}
                  placeholder="Phone"
                  keyboardType="phone-pad"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowEditModal(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSaveProfile}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profileSection: {
    alignItems: 'center',
    padding: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  walletAddress: {
    fontSize: 14,
    color: colors.accent,
    fontFamily: 'monospace',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  positiveValue: {
    color: colors.positive,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    fontSize: 20,
    marginRight: 15,
  },
  settingTitle: {
    fontSize: 16,
    color: colors.text,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 15,
  },
  menuTitle: {
    fontSize: 16,
    color: colors.text,
  },
  menuArrow: {
    fontSize: 20,
    color: colors.textMuted,
  },
  logoutSection: {
    marginHorizontal: 20,
    marginBottom: 40,
  },
  logoutButton: {
    backgroundColor: colors.negative,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.secondary,
    margin: 20,
    padding: 25,
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: colors.primary,
    color: colors.text,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.accent,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;