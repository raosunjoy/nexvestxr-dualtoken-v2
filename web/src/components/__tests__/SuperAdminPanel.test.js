// ============================================================================
// SUPERADMIN PANEL COMPONENT TESTS
// ============================================================================

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import SuperAdminPanel from '../SuperAdminPanel';
import { AuthContext } from '../../contexts/AuthContext';
import axios from 'axios';

// Mock axios
jest.mock('axios');

// Mock XUMM SDK
jest.mock('xumm', () => ({
    Xumm: jest.fn().mockImplementation(() => ({
        on: jest.fn(),
        payload: {
            create: jest.fn().mockResolvedValue({
                uuid: 'mock-uuid',
                next: { always: 'https://xumm.app/sign/mock-uuid' },
                refs: { qr_png: 'mock-qr-url' }
            }),
            get: jest.fn().mockResolvedValue({
                meta: { resolved: true, signed: true },
                response: { account: 'rMockXRPLAddress' }
            })
        }
    }))
}));

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
    Line: () => <div data-testid="line-chart">Line Chart</div>,
    Bar: () => <div data-testid="bar-chart">Bar Chart</div>,
    Doughnut: () => <div data-testid="doughnut-chart">Doughnut Chart</div>,
    Radar: () => <div data-testid="radar-chart">Radar Chart</div>
}));

// Mock contexts
const mockAuthContext = {
    user: {
        id: 'superadmin123',
        username: 'testsuperadmin',
        email: 'superadmin@nexvestxr.com',
        role: 'superadmin',
        token: 'mock-jwt-token'
    },
    isAuthenticated: true,
    logout: jest.fn()
};

const renderWithProviders = (component) => {
    return render(
        <BrowserRouter>
            <AuthContext.Provider value={mockAuthContext}>
                {component}
            </AuthContext.Provider>
        </BrowserRouter>
    );
};

describe('SuperAdminPanel Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock API responses
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/superadmin/config')) {
                return Promise.resolve({
                    data: {
                        success: true,
                        data: {
                            platform: {
                                name: 'NexVestXR',
                                version: '2.0.0',
                                environment: 'production'
                            },
                            blockchain: {
                                xrpl: { network: 'mainnet', connected: true },
                                flare: { network: 'mainnet', connected: true }
                            },
                            fees: {
                                platformFee: 1.5,
                                developerTier1Fee: 1.0,
                                developerTier2Fee: 2.0
                            },
                            limits: {
                                minInvestment: 25000,
                                maxInvestment: 50000000
                            }
                        }
                    }
                });
            } else if (url.includes('/api/superadmin/metrics/detailed')) {
                return Promise.resolve({
                    data: {
                        success: true,
                        data: {
                            server: {
                                uptime: 864000,
                                cpu: 45.2,
                                memory: 67.8,
                                requests: 125430
                            },
                            database: {
                                connections: 50,
                                queries: 543210,
                                performance: 'optimal'
                            },
                            blockchain: {
                                xrpl: { blocks: 75000000, tps: 1500 },
                                flare: { blocks: 5000000, tps: 500 }
                            },
                            cache: {
                                hits: 98543,
                                misses: 1457,
                                hitRate: 98.5
                            }
                        }
                    }
                });
            } else if (url.includes('/api/superadmin/treasury/balance')) {
                return Promise.resolve({
                    data: {
                        success: true,
                        data: {
                            totalBalance: 15000000,
                            byToken: {
                                XERA: 5000000,
                                PROPX: 3000000,
                                XRP: 2000000
                            },
                            byCurrency: {
                                AED: 10000000,
                                USD: 5000000
                            }
                        }
                    }
                });
            }
            return Promise.reject(new Error('Not found'));
        });
    });

    describe('Rendering', () => {
        it('should render superadmin panel with correct title', () => {
            renderWithProviders(<SuperAdminPanel />);
            
            expect(screen.getByText(/SuperAdmin Panel/i)).toBeInTheDocument();
            expect(screen.getByText(/Welcome, testsuperadmin/i)).toBeInTheDocument();
        });

        it('should show superadmin-only features', () => {
            renderWithProviders(<SuperAdminPanel />);
            
            expect(screen.getByText(/System Configuration/i)).toBeInTheDocument();
            expect(screen.getByText(/Emergency Controls/i)).toBeInTheDocument();
            expect(screen.getByText(/Treasury Management/i)).toBeInTheDocument();
            expect(screen.getByText(/Developer Management/i)).toBeInTheDocument();
        });

        it('should display XUMM wallet integration', () => {
            renderWithProviders(<SuperAdminPanel />);
            
            expect(screen.getByText(/XUMM Wallet/i)).toBeInTheDocument();
            expect(screen.getByText(/Connect Wallet/i)).toBeInTheDocument();
        });
    });

    describe('System Configuration', () => {
        it('should load and display platform configuration', async () => {
            renderWithProviders(<SuperAdminPanel />);
            
            await waitFor(() => {
                expect(screen.getByText(/NexVestXR/)).toBeInTheDocument();
                expect(screen.getByText(/2.0.0/)).toBeInTheDocument();
                expect(screen.getByText(/production/i)).toBeInTheDocument();
            });
        });

        it('should display fee structure', async () => {
            renderWithProviders(<SuperAdminPanel />);
            
            await waitFor(() => {
                expect(screen.getByText(/Platform Fee: 1.5%/i)).toBeInTheDocument();
                expect(screen.getByText(/Tier 1: 1.0%/i)).toBeInTheDocument();
                expect(screen.getByText(/Tier 2: 2.0%/i)).toBeInTheDocument();
            });
        });

        it('should allow fee structure updates', async () => {
            axios.put.mockResolvedValueOnce({
                data: {
                    success: true,
                    data: { fees: { platformFee: 2.0 } }
                }
            });

            renderWithProviders(<SuperAdminPanel />);
            
            await waitFor(() => {
                const editButton = screen.getByText(/Edit Fees/i);
                fireEvent.click(editButton);
                
                const feeInput = screen.getByLabelText(/Platform Fee/i);
                fireEvent.change(feeInput, { target: { value: '2.0' } });
                
                const saveButton = screen.getByText(/Save Changes/i);
                fireEvent.click(saveButton);
                
                expect(axios.put).toHaveBeenCalledWith(
                    expect.stringContaining('/api/superadmin/config'),
                    expect.objectContaining({
                        fees: expect.objectContaining({
                            platformFee: 2.0
                        })
                    }),
                    expect.any(Object)
                );
            });
        });
    });

    describe('Emergency Controls', () => {
        it('should display emergency control buttons', () => {
            renderWithProviders(<SuperAdminPanel />);
            
            const emergencyTab = screen.getByText(/Emergency Controls/i);
            fireEvent.click(emergencyTab);
            
            expect(screen.getByText(/Maintenance Mode/i)).toBeInTheDocument();
            expect(screen.getByText(/Freeze Trading/i)).toBeInTheDocument();
            expect(screen.getByText(/Emergency Shutdown/i)).toBeInTheDocument();
        });

        it('should enable maintenance mode', async () => {
            axios.post.mockResolvedValueOnce({
                data: {
                    success: true,
                    data: { maintenanceMode: true }
                }
            });

            renderWithProviders(<SuperAdminPanel />);
            
            const emergencyTab = screen.getByText(/Emergency Controls/i);
            fireEvent.click(emergencyTab);
            
            const maintenanceButton = screen.getByText(/Enable Maintenance/i);
            fireEvent.click(maintenanceButton);
            
            // Should show confirmation dialog
            expect(screen.getByText(/Are you sure/i)).toBeInTheDocument();
            
            const confirmButton = screen.getByText(/Confirm/i);
            fireEvent.click(confirmButton);
            
            await waitFor(() => {
                expect(axios.post).toHaveBeenCalledWith(
                    expect.stringContaining('/api/superadmin/emergency/maintenance'),
                    expect.objectContaining({ enabled: true }),
                    expect.any(Object)
                );
            });
        });

        it('should freeze trading with confirmation', async () => {
            axios.post.mockResolvedValueOnce({
                data: {
                    success: true,
                    data: { tradingFrozen: true }
                }
            });

            renderWithProviders(<SuperAdminPanel />);
            
            const emergencyTab = screen.getByText(/Emergency Controls/i);
            fireEvent.click(emergencyTab);
            
            const freezeButton = screen.getByText(/Freeze All Trading/i);
            fireEvent.click(freezeButton);
            
            // Enter reason
            const reasonInput = screen.getByLabelText(/Reason/i);
            fireEvent.change(reasonInput, { target: { value: 'Market volatility detected' } });
            
            const confirmButton = screen.getByText(/Confirm Freeze/i);
            fireEvent.click(confirmButton);
            
            await waitFor(() => {
                expect(axios.post).toHaveBeenCalledWith(
                    expect.stringContaining('/api/superadmin/emergency/freeze-trading'),
                    expect.objectContaining({
                        reason: 'Market volatility detected'
                    }),
                    expect.any(Object)
                );
            });
        });
    });

    describe('Treasury Management', () => {
        it('should display treasury balance', async () => {
            renderWithProviders(<SuperAdminPanel />);
            
            const treasuryTab = screen.getByText(/Treasury Management/i);
            fireEvent.click(treasuryTab);
            
            await waitFor(() => {
                expect(screen.getByText(/Total Balance: 15,000,000/i)).toBeInTheDocument();
                expect(screen.getByText(/XERA: 5,000,000/i)).toBeInTheDocument();
                expect(screen.getByText(/PROPX: 3,000,000/i)).toBeInTheDocument();
                expect(screen.getByText(/XRP: 2,000,000/i)).toBeInTheDocument();
            });
        });

        it('should initiate treasury withdrawal with 2FA', async () => {
            axios.post.mockResolvedValueOnce({
                data: {
                    success: true,
                    data: {
                        withdrawalId: 'WD_001',
                        status: 'pending_2fa'
                    }
                }
            });

            renderWithProviders(<SuperAdminPanel />);
            
            const treasuryTab = screen.getByText(/Treasury Management/i);
            fireEvent.click(treasuryTab);
            
            await waitFor(() => {
                const withdrawButton = screen.getByText(/Withdraw Funds/i);
                fireEvent.click(withdrawButton);
                
                // Fill withdrawal form
                const amountInput = screen.getByLabelText(/Amount/i);
                fireEvent.change(amountInput, { target: { value: '100000' } });
                
                const currencySelect = screen.getByLabelText(/Currency/i);
                fireEvent.change(currencySelect, { target: { value: 'AED' } });
                
                const destinationInput = screen.getByLabelText(/Destination/i);
                fireEvent.change(destinationInput, { target: { value: 'operating_expenses' } });
                
                const submit2FAButton = screen.getByText(/Submit with 2FA/i);
                fireEvent.click(submit2FAButton);
                
                // Enter 2FA code
                const tfaInput = screen.getByLabelText(/2FA Code/i);
                fireEvent.change(tfaInput, { target: { value: '123456' } });
                
                const confirmButton = screen.getByText(/Confirm Withdrawal/i);
                fireEvent.click(confirmButton);
                
                expect(axios.post).toHaveBeenCalledWith(
                    expect.stringContaining('/api/superadmin/treasury/withdraw'),
                    expect.objectContaining({
                        amount: 100000,
                        currency: 'AED',
                        destination: 'operating_expenses',
                        approvalCode: '123456'
                    }),
                    expect.any(Object)
                );
            });
        });
    });

    describe('Developer Management', () => {
        it('should display developer list', async () => {
            axios.get.mockResolvedValueOnce({
                data: {
                    success: true,
                    data: {
                        developers: [
                            {
                                _id: '1',
                                username: 'emaar',
                                companyName: 'EMAAR Properties',
                                tier: 'TIER1',
                                propertiesTokenized: 15
                            },
                            {
                                _id: '2',
                                username: 'aldar',
                                companyName: 'ALDAR Properties',
                                tier: 'TIER1',
                                propertiesTokenized: 12
                            }
                        ]
                    }
                }
            });

            renderWithProviders(<SuperAdminPanel />);
            
            const developerTab = screen.getByText(/Developer Management/i);
            fireEvent.click(developerTab);
            
            await waitFor(() => {
                expect(screen.getByText('EMAAR Properties')).toBeInTheDocument();
                expect(screen.getByText('ALDAR Properties')).toBeInTheDocument();
                expect(screen.getAllByText(/TIER1/i)).toHaveLength(2);
            });
        });

        it('should update developer tier', async () => {
            axios.put.mockResolvedValueOnce({
                data: {
                    success: true,
                    data: { tier: 'TIER2' }
                }
            });

            renderWithProviders(<SuperAdminPanel />);
            
            const developerTab = screen.getByText(/Developer Management/i);
            fireEvent.click(developerTab);
            
            await waitFor(() => {
                const changeTierButton = screen.getAllByText(/Change Tier/i)[0];
                fireEvent.click(changeTierButton);
                
                const tierSelect = screen.getByLabelText(/New Tier/i);
                fireEvent.change(tierSelect, { target: { value: 'TIER2' } });
                
                const saveButton = screen.getByText(/Save Tier/i);
                fireEvent.click(saveButton);
                
                expect(axios.put).toHaveBeenCalled();
            });
        });
    });

    describe('System Monitoring', () => {
        it('should display detailed system metrics', async () => {
            renderWithProviders(<SuperAdminPanel />);
            
            const monitoringTab = screen.getByText(/System Monitoring/i);
            fireEvent.click(monitoringTab);
            
            await waitFor(() => {
                expect(screen.getByText(/Server Uptime: 10 days/i)).toBeInTheDocument();
                expect(screen.getByText(/CPU Usage: 45.2%/i)).toBeInTheDocument();
                expect(screen.getByText(/Memory Usage: 67.8%/i)).toBeInTheDocument();
                expect(screen.getByText(/Cache Hit Rate: 98.5%/i)).toBeInTheDocument();
            });
        });

        it('should show blockchain metrics', async () => {
            renderWithProviders(<SuperAdminPanel />);
            
            const monitoringTab = screen.getByText(/System Monitoring/i);
            fireEvent.click(monitoringTab);
            
            await waitFor(() => {
                expect(screen.getByText(/XRPL Blocks: 75,000,000/i)).toBeInTheDocument();
                expect(screen.getByText(/XRPL TPS: 1,500/i)).toBeInTheDocument();
                expect(screen.getByText(/Flare Blocks: 5,000,000/i)).toBeInTheDocument();
                expect(screen.getByText(/Flare TPS: 500/i)).toBeInTheDocument();
            });
        });
    });

    describe('User Role Management', () => {
        it('should promote user to admin', async () => {
            axios.put.mockResolvedValueOnce({
                data: {
                    success: true,
                    data: { role: 'admin' }
                }
            });

            renderWithProviders(<SuperAdminPanel />);
            
            const usersTab = screen.getByText(/User Management/i);
            fireEvent.click(usersTab);
            
            await waitFor(() => {
                const promoteButton = screen.getByText(/Promote to Admin/i);
                fireEvent.click(promoteButton);
                
                // Enter user ID
                const userIdInput = screen.getByLabelText(/User ID/i);
                fireEvent.change(userIdInput, { target: { value: 'user123' } });
                
                const confirmButton = screen.getByText(/Confirm Promotion/i);
                fireEvent.click(confirmButton);
                
                expect(axios.put).toHaveBeenCalledWith(
                    expect.stringContaining('/api/superadmin/users/user123/role'),
                    expect.objectContaining({ role: 'admin' }),
                    expect.any(Object)
                );
            });
        });
    });

    describe('XUMM Wallet Integration', () => {
        it('should connect XUMM wallet', async () => {
            renderWithProviders(<SuperAdminPanel />);
            
            const connectButton = screen.getByText(/Connect Wallet/i);
            fireEvent.click(connectButton);
            
            await waitFor(() => {
                expect(screen.getByText(/Scan QR Code/i)).toBeInTheDocument();
                expect(screen.getByAltText(/XUMM QR Code/i)).toHaveAttribute('src', 'mock-qr-url');
            });
        });

        it('should show connected wallet address', async () => {
            // Mock wallet already connected
            axios.get.mockResolvedValueOnce({
                data: {
                    success: true,
                    data: {
                        connected: true,
                        address: 'rMockXRPLAddress'
                    }
                }
            });

            renderWithProviders(<SuperAdminPanel />);
            
            await waitFor(() => {
                expect(screen.getByText(/Connected: rMockXRPLAddress/i)).toBeInTheDocument();
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle API errors gracefully', async () => {
            axios.get.mockRejectedValueOnce(new Error('Server error'));
            
            renderWithProviders(<SuperAdminPanel />);
            
            await waitFor(() => {
                expect(screen.getByText(/Error loading configuration/i)).toBeInTheDocument();
                expect(screen.getByText(/Retry/i)).toBeInTheDocument();
            });
        });

        it('should require confirmation for critical actions', async () => {
            renderWithProviders(<SuperAdminPanel />);
            
            const emergencyTab = screen.getByText(/Emergency Controls/i);
            fireEvent.click(emergencyTab);
            
            const shutdownButton = screen.getByText(/Emergency Shutdown/i);
            fireEvent.click(shutdownButton);
            
            expect(screen.getByText(/This action cannot be undone/i)).toBeInTheDocument();
            expect(screen.getByText(/Type CONFIRM to proceed/i)).toBeInTheDocument();
        });
    });

    describe('Audit Logging', () => {
        it('should log all superadmin actions', async () => {
            axios.post.mockResolvedValueOnce({
                data: { success: true }
            });

            renderWithProviders(<SuperAdminPanel />);
            
            // Any action should trigger audit log
            const emergencyTab = screen.getByText(/Emergency Controls/i);
            fireEvent.click(emergencyTab);
            
            const maintenanceButton = screen.getByText(/Enable Maintenance/i);
            fireEvent.click(maintenanceButton);
            
            await waitFor(() => {
                // Verify audit log was created
                expect(axios.post).toHaveBeenCalledWith(
                    expect.stringContaining('/api/superadmin/audit/log'),
                    expect.objectContaining({
                        action: expect.any(String),
                        userId: 'superadmin123'
                    }),
                    expect.any(Object)
                );
            });
        });
    });
});