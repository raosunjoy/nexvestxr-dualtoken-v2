// ============================================================================
// GOVERNANCE VOTING SCREEN - Mobile DAO Interface
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { PieChart } from 'react-native-chart-kit';
import { useAuth } from '../utils/AuthContext';
import { governanceService } from '../services/GovernanceService';

const { width: screenWidth } = Dimensions.get('window');

const GovernanceScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [activeProposals, setActiveProposals] = useState([]);
  const [userVotingPower, setUserVotingPower] = useState(0);
  const [governanceStats, setGovernanceStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [voteModalVisible, setVoteModalVisible] = useState(false);
  const [proposalModalVisible, setProposalModalVisible] = useState(false);
  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    type: 'CITY_POOL_EXPANSION'
  });

  useEffect(() => {
    fetchGovernanceData();
  }, []);

  const fetchGovernanceData = async () => {
    try {
      setLoading(true);
      
      const [proposals, votingPower, stats] = await Promise.all([
        governanceService.getActiveProposals(),
        governanceService.getUserVotingPower(user.address),
        governanceService.getGovernanceStats()
      ]);

      setActiveProposals(proposals);
      setUserVotingPower(votingPower);
      setGovernanceStats(stats);
    } catch (error) {
      console.error('Error fetching governance data:', error);
      Alert.alert('Error', 'Failed to load governance data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchGovernanceData();
  };

  const handleVote = async (proposalId, support, reason = '') => {
    try {
      const result = await governanceService.castVote(proposalId, support, reason);
      
      if (result.success) {
        Alert.alert('Success', 'Vote cast successfully!');
        setVoteModalVisible(false);
        setSelectedProposal(null);
        fetchGovernanceData(); // Refresh data
      } else {
        Alert.alert('Error', result.error || 'Failed to cast vote');
      }
    } catch (error) {
      console.error('Error casting vote:', error);
      Alert.alert('Error', 'Failed to cast vote');
    }
  };

  const handleCreateProposal = async () => {
    try {
      if (!newProposal.title || !newProposal.description) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }

      const result = await governanceService.createProposal(newProposal);
      
      if (result.success) {
        Alert.alert('Success', 'Proposal created successfully!');
        setProposalModalVisible(false);
        setNewProposal({ title: '', description: '', type: 'CITY_POOL_EXPANSION' });
        fetchGovernanceData();
      } else {
        Alert.alert('Error', result.error || 'Failed to create proposal');
      }
    } catch (error) {
      console.error('Error creating proposal:', error);
      Alert.alert('Error', 'Failed to create proposal');
    }
  };

  const getProposalTypeIcon = (type) => {
    switch (type) {
      case 'CITY_POOL_EXPANSION': return 'location-city';
      case 'PLATFORM_FEE_CHANGE': return 'account-balance';
      case 'STAKING_REWARD_ADJUSTMENT': return 'savings';
      case 'PROPERTY_ADDITION': return 'business';
      case 'TREASURY_ALLOCATION': return 'account-balance-wallet';
      default: return 'how-to-vote';
    }
  };

  const getProposalTypeColor = (type) => {
    switch (type) {
      case 'CITY_POOL_EXPANSION': return '#10B981';
      case 'PLATFORM_FEE_CHANGE': return '#F59E0B';
      case 'STAKING_REWARD_ADJUSTMENT': return '#8B5CF6';
      case 'PROPERTY_ADDITION': return '#06B6D4';
      case 'TREASURY_ALLOCATION': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getVoteStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return '#10B981';
      case 'SUCCEEDED': return '#059669';
      case 'DEFEATED': return '#EF4444';
      case 'PENDING': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const formatProposalType = (type) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const calculateTimeRemaining = (endTime) => {
    const now = Date.now();
    const end = new Date(endTime).getTime();
    const diff = end - now;
    
    if (diff <= 0) return 'Voting ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  const VoteModal = () => (
    <Modal
      visible={voteModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setVoteModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Cast Your Vote</Text>
            <TouchableOpacity onPress={() => setVoteModalVisible(false)}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          {selectedProposal && (
            <View style={styles.modalContent}>
              <Text style={styles.proposalTitle}>{selectedProposal.title}</Text>
              <Text style={styles.proposalDescription} numberOfLines={3}>
                {selectedProposal.description}
              </Text>
              
              <View style={styles.votingPowerInfo}>
                <Icon name="how-to-vote" size={20} color="#8B5CF6" />
                <Text style={styles.votingPowerText}>
                  Your voting power: {userVotingPower.toLocaleString()} votes
                </Text>
              </View>

              <View style={styles.voteOptions}>
                <TouchableOpacity
                  style={[styles.voteButton, styles.forButton]}
                  onPress={() => handleVote(selectedProposal.id, 1)}
                >
                  <Icon name="thumb-up" size={20} color="white" />
                  <Text style={styles.voteButtonText}>Vote FOR</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.voteButton, styles.againstButton]}
                  onPress={() => handleVote(selectedProposal.id, 0)}
                >
                  <Icon name="thumb-down" size={20} color="white" />
                  <Text style={styles.voteButtonText}>Vote AGAINST</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.voteButton, styles.abstainButton]}
                  onPress={() => handleVote(selectedProposal.id, 2)}
                >
                  <Icon name="remove" size={20} color="white" />
                  <Text style={styles.voteButtonText}>ABSTAIN</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  const CreateProposalModal = () => (
    <Modal
      visible={proposalModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setProposalModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { maxHeight: '80%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Proposal</Text>
            <TouchableOpacity onPress={() => setProposalModalVisible(false)}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Proposal Title</Text>
              <TextInput
                style={styles.textInput}
                value={newProposal.title}
                onChangeText={(text) => setNewProposal({...newProposal, title: text})}
                placeholder="Enter proposal title"
                multiline
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, { height: 120 }]}
                value={newProposal.description}
                onChangeText={(text) => setNewProposal({...newProposal, description: text})}
                placeholder="Describe your proposal in detail"
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Proposal Type</Text>
              <View style={styles.typeSelector}>
                {[
                  'CITY_POOL_EXPANSION',
                  'PLATFORM_FEE_CHANGE',
                  'STAKING_REWARD_ADJUSTMENT',
                  'PROPERTY_ADDITION',
                  'TREASURY_ALLOCATION'
                ].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeOption,
                      newProposal.type === type && styles.selectedTypeOption
                    ]}
                    onPress={() => setNewProposal({...newProposal, type})}
                  >
                    <Text style={[
                      styles.typeOptionText,
                      newProposal.type === type && styles.selectedTypeOptionText
                    ]}>
                      {formatProposalType(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateProposal}
            >
              <Text style={styles.createButtonText}>Create Proposal</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Icon name="how-to-vote" size={40} color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading Governance...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Governance</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Icon name="refresh" size={24} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Voting Power Card */}
        <View style={styles.votingPowerCard}>
          <View style={styles.votingPowerHeader}>
            <Icon name="how-to-vote" size={32} color="#8B5CF6" />
            <View style={styles.votingPowerInfo}>
              <Text style={styles.votingPowerTitle}>Your Voting Power</Text>
              <Text style={styles.votingPowerValue}>{userVotingPower.toLocaleString()}</Text>
            </View>
          </View>
          <Text style={styles.votingPowerSubtext}>
            Based on your XERA holdings and staking participation
          </Text>
        </View>

        {/* Governance Stats */}
        {governanceStats && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>DAO Statistics</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{governanceStats.totalProposals}</Text>
                <Text style={styles.statLabel}>Total Proposals</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{governanceStats.activeProposals}</Text>
                <Text style={styles.statLabel}>Active Votes</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{governanceStats.participationRate}%</Text>
                <Text style={styles.statLabel}>Participation</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{governanceStats.quorumRequired}%</Text>
                <Text style={styles.statLabel}>Quorum</Text>
              </View>
            </View>
          </View>
        )}

        {/* Active Proposals */}
        <View style={styles.proposalsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Proposals</Text>
            <TouchableOpacity
              style={styles.createProposalButton}
              onPress={() => setProposalModalVisible(true)}
            >
              <Icon name="add" size={20} color="white" />
              <Text style={styles.createProposalText}>Create</Text>
            </TouchableOpacity>
          </View>

          {activeProposals.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="ballot" size={48} color="#d1d5db" />
              <Text style={styles.emptyStateText}>No active proposals</Text>
              <Text style={styles.emptyStateSubtext}>Be the first to create a proposal</Text>
            </View>
          ) : (
            activeProposals.map((proposal) => (
              <View key={proposal.id} style={styles.proposalCard}>
                <View style={styles.proposalHeader}>
                  <View style={styles.proposalTypeTag}>
                    <Icon 
                      name={getProposalTypeIcon(proposal.type)} 
                      size={16} 
                      color={getProposalTypeColor(proposal.type)} 
                    />
                    <Text style={[styles.proposalTypeText, { color: getProposalTypeColor(proposal.type) }]}>
                      {formatProposalType(proposal.type)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getVoteStatusColor(proposal.status) }]}>
                    <Text style={styles.statusText}>{proposal.status}</Text>
                  </View>
                </View>

                <Text style={styles.proposalTitle}>{proposal.title}</Text>
                <Text style={styles.proposalDescription} numberOfLines={2}>
                  {proposal.description}
                </Text>

                <View style={styles.proposalMeta}>
                  <Text style={styles.proposalTime}>
                    {calculateTimeRemaining(proposal.endTime)}
                  </Text>
                  <Text style={styles.proposalProposer}>
                    by {proposal.proposer.slice(0, 8)}...
                  </Text>
                </View>

                {/* Voting Progress */}
                <View style={styles.votingProgress}>
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>For: {proposal.forVotes}</Text>
                    <Text style={styles.progressLabel}>Against: {proposal.againstVotes}</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        styles.forProgress,
                        { width: `${(proposal.forVotes / (proposal.forVotes + proposal.againstVotes + 1)) * 100}%` }
                      ]} 
                    />
                    <View 
                      style={[
                        styles.progressFill, 
                        styles.againstProgress,
                        { width: `${(proposal.againstVotes / (proposal.forVotes + proposal.againstVotes + 1)) * 100}%` }
                      ]} 
                    />
                  </View>
                </View>

                <View style={styles.proposalActions}>
                  <TouchableOpacity
                    style={styles.detailsButton}
                    onPress={() => navigation.navigate('ProposalDetails', { proposalId: proposal.id })}
                  >
                    <Text style={styles.detailsButtonText}>View Details</Text>
                  </TouchableOpacity>
                  
                  {proposal.status === 'ACTIVE' && !proposal.userHasVoted && (
                    <TouchableOpacity
                      style={styles.voteButton}
                      onPress={() => {
                        setSelectedProposal(proposal);
                        setVoteModalVisible(true);
                      }}
                    >
                      <Icon name="how-to-vote" size={16} color="white" />
                      <Text style={styles.voteButtonText}>Vote</Text>
                    </TouchableOpacity>
                  )}
                  
                  {proposal.userHasVoted && (
                    <View style={styles.votedIndicator}>
                      <Icon name="check-circle" size={16} color="#10B981" />
                      <Text style={styles.votedText}>Voted</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {[
            { type: 'vote', proposal: 'Mumbai Pool Expansion', action: 'Voted FOR', time: '2 hours ago' },
            { type: 'proposal', proposal: 'Platform Fee Reduction', action: 'Proposal Created', time: '1 day ago' },
            { type: 'execution', proposal: 'Staking Reward Increase', action: 'Proposal Executed', time: '3 days ago' },
          ].map((activity, index) => (
            <View key={index} style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Icon 
                  name={activity.type === 'vote' ? 'how-to-vote' : activity.type === 'proposal' ? 'add-circle' : 'check-circle'} 
                  size={16} 
                  color="#8B5CF6" 
                />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityAction}>{activity.action}</Text>
                <Text style={styles.activityProposal}>{activity.proposal}</Text>
              </View>
              <Text style={styles.activityTime}>{activity.time}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <VoteModal />
      <CreateProposalModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  votingPowerCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  votingPowerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  votingPowerInfo: {
    marginLeft: 15,
  },
  votingPowerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  votingPowerValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginTop: 2,
  },
  votingPowerSubtext: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    width: '50%',
    alignItems: 'center',
    marginBottom: 15,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  proposalsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  createProposalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createProposalText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#d1d5db',
    marginTop: 5,
  },
  proposalCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  proposalTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  proposalTypeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  proposalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  proposalDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 15,
  },
  proposalMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  proposalTime: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '600',
  },
  proposalProposer: {
    fontSize: 12,
    color: '#666',
  },
  votingProgress: {
    marginBottom: 15,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    flexDirection: 'row',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  forProgress: {
    backgroundColor: '#10B981',
  },
  againstProgress: {
    backgroundColor: '#EF4444',
  },
  proposalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
  },
  detailsButtonText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  voteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  votedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  votedText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  activitySection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  activityProposal: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 20,
    maxWidth: screenWidth - 40,
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  modalContent: {
    padding: 20,
  },
  voteOptions: {
    marginTop: 20,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  forButton: {
    backgroundColor: '#10B981',
  },
  againstButton: {
    backgroundColor: '#EF4444',
  },
  abstainButton: {
    backgroundColor: '#6B7280',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1a1a1a',
  },
  typeSelector: {
    gap: 10,
  },
  typeOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedTypeOption: {
    borderColor: '#8B5CF6',
    backgroundColor: '#f3f4f6',
  },
  typeOptionText: {
    fontSize: 14,
    color: '#666',
  },
  selectedTypeOptionText: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GovernanceScreen;