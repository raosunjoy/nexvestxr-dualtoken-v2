// ============================================================================
// ADMIN DASHBOARD COMPONENT TESTS
// ============================================================================

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import AdminDashboard from '../AdminDashboard';
import { AuthContext } from '../../contexts/AuthContext';
import axios from 'axios';

// Mock axios
jest.mock('axios');

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
    Line: () => <div data-testid="line-chart">Line Chart</div>,
    Bar: () => <div data-testid="bar-chart">Bar Chart</div>,
    Doughnut: () => <div data-testid="doughnut-chart">Doughnut Chart</div>
}));

// Mock contexts and services
const mockAuthContext = {
    user: {
        id: 'admin123',
        username: 'testadmin',
        email: 'admin@nexvestxr.com',
        role: 'admin',
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

describe('AdminDashboard Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock API responses
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/admin/dashboard/stats')) {
                return Promise.resolve({
                    data: {
                        success: true,
                        data: {
                            overview: {
                                totalUsers: 1543,
                                totalProperties: 87,
                                totalInvestments: 125000000,
                                platformHealth: 'optimal'
                            },
                            recent: {
                                users: [
                                    { _id: '1', username: 'user1', email: 'user1@test.com', createdAt: new Date() },
                                    { _id: '2', username: 'user2', email: 'user2@test.com', createdAt: new Date() }
                                ],
                                properties: [
                                    { _id: '1', name: 'Property 1', location: 'Dubai', totalValue: 5000000 },
                                    { _id: '2', name: 'Property 2', location: 'Abu Dhabi', totalValue: 8000000 }
                                ]
                            }
                        }
                    }
                });
            } else if (url.includes('/api/admin/analytics/users')) {
                return Promise.resolve({
                    data: {
                        success: true,
                        data: {
                            usersByRole: [
                                { _id: 'user', count: 1500 },
                                { _id: 'admin', count: 10 },
                                { _id: 'developer', count: 33 }
                            ],
                            kycDistribution: [
                                { _id: 'none', count: 200 },
                                { _id: 'basic', count: 800 },
                                { _id: 'enhanced', count: 400 },
                                { _id: 'premium', count: 143 }
                            ]
                        }
                    }
                });
            } else if (url.includes('/api/admin/properties')) {
                return Promise.resolve({
                    data: {
                        success: true,
                        data: {
                            properties: [
                                {
                                    _id: '1',
                                    propertyId: 'PROP_001',
                                    name: 'Burj Vista',
                                    location: 'Dubai Marina',
                                    status: 'Active',
                                    totalValue: 10000000,
                                    developer: { username: 'emaar', email: 'dev@emaar.ae' }
                                }
                            ],
                            pagination: { currentPage: 1, totalPages: 5, totalProperties: 87 }
                        }
                    }
                });
            }
            return Promise.reject(new Error('Not found'));
        });
    });

    describe('Rendering', () => {
        it('should render admin dashboard with Aldar branding', () => {
            renderWithProviders(<AdminDashboard />);
            
            expect(screen.getByText(/Admin Dashboard/i)).toBeInTheDocument();
            expect(screen.getByText(/NexVestXR/i)).toBeInTheDocument();
            expect(screen.getByAltText(/Aldar Logo/i)).toBeInTheDocument();
        });

        it('should display admin username', () => {
            renderWithProviders(<AdminDashboard />);
            
            expect(screen.getByText(/Welcome, testadmin/i)).toBeInTheDocument();
        });

        it('should render navigation sidebar', () => {
            renderWithProviders(<AdminDashboard />);
            
            expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
            expect(screen.getByText(/Properties/i)).toBeInTheDocument();
            expect(screen.getByText(/PROPX Tokens/i)).toBeInTheDocument();
            expect(screen.getByText(/Analytics/i)).toBeInTheDocument();
            expect(screen.getByText(/Investors/i)).toBeInTheDocument();
            expect(screen.getByText(/Compliance/i)).toBeInTheDocument();
        });
    });

    describe('Dashboard Overview', () => {
        it('should fetch and display platform statistics', async () => {
            renderWithProviders(<AdminDashboard />);
            
            await waitFor(() => {
                expect(screen.getByText(/1,543/)).toBeInTheDocument(); // Total users
                expect(screen.getByText(/87/)).toBeInTheDocument(); // Total properties
                expect(screen.getByText(/125,000,000/)).toBeInTheDocument(); // Total investments
                expect(screen.getByText(/optimal/i)).toBeInTheDocument(); // Platform health
            });
        });

        it('should display recent users', async () => {
            renderWithProviders(<AdminDashboard />);
            
            await waitFor(() => {
                expect(screen.getByText('user1')).toBeInTheDocument();
                expect(screen.getByText('user2')).toBeInTheDocument();
            });
        });

        it('should display recent properties', async () => {
            renderWithProviders(<AdminDashboard />);
            
            await waitFor(() => {
                expect(screen.getByText('Property 1')).toBeInTheDocument();
                expect(screen.getByText('Property 2')).toBeInTheDocument();
            });
        });

        it('should show charts for analytics', async () => {
            renderWithProviders(<AdminDashboard />);
            
            await waitFor(() => {
                expect(screen.getByTestId('line-chart')).toBeInTheDocument();
                expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
                expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
            });
        });
    });

    describe('Navigation', () => {
        it('should switch to Properties view when clicked', async () => {
            renderWithProviders(<AdminDashboard />);
            
            const propertiesTab = screen.getByText(/Properties/i);
            fireEvent.click(propertiesTab);
            
            await waitFor(() => {
                expect(screen.getByText('Burj Vista')).toBeInTheDocument();
                expect(screen.getByText('Dubai Marina')).toBeInTheDocument();
            });
        });

        it('should switch to Analytics view when clicked', async () => {
            renderWithProviders(<AdminDashboard />);
            
            const analyticsTab = screen.getByText(/Analytics/i);
            fireEvent.click(analyticsTab);
            
            await waitFor(() => {
                expect(screen.getByText(/User Distribution/i)).toBeInTheDocument();
                expect(screen.getByText(/KYC Levels/i)).toBeInTheDocument();
            });
        });
    });

    describe('Property Management', () => {
        it('should display property list with actions', async () => {
            renderWithProviders(<AdminDashboard />);
            
            const propertiesTab = screen.getByText(/Properties/i);
            fireEvent.click(propertiesTab);
            
            await waitFor(() => {
                expect(screen.getByText('PROP_001')).toBeInTheDocument();
                expect(screen.getByText(/Active/i)).toBeInTheDocument();
                expect(screen.getByText(/10,000,000/)).toBeInTheDocument();
                expect(screen.getByText('emaar')).toBeInTheDocument();
            });
        });

        it('should open property details modal', async () => {
            renderWithProviders(<AdminDashboard />);
            
            const propertiesTab = screen.getByText(/Properties/i);
            fireEvent.click(propertiesTab);
            
            await waitFor(() => {
                const viewButton = screen.getByText(/View Details/i);
                fireEvent.click(viewButton);
                
                expect(screen.getByText(/Property Details/i)).toBeInTheDocument();
                expect(screen.getByText(/Burj Vista/i)).toBeInTheDocument();
            });
        });

        it('should handle property status update', async () => {
            axios.put.mockResolvedValueOnce({
                data: {
                    success: true,
                    data: { status: 'Tokenized' }
                }
            });

            renderWithProviders(<AdminDashboard />);
            
            const propertiesTab = screen.getByText(/Properties/i);
            fireEvent.click(propertiesTab);
            
            await waitFor(() => {
                const approveButton = screen.getByText(/Approve/i);
                fireEvent.click(approveButton);
                
                expect(axios.put).toHaveBeenCalledWith(
                    expect.stringContaining('/api/admin/properties'),
                    expect.any(Object),
                    expect.any(Object)
                );
            });
        });
    });

    describe('User Management', () => {
        it('should display investor list', async () => {
            renderWithProviders(<AdminDashboard />);
            
            const investorsTab = screen.getByText(/Investors/i);
            fireEvent.click(investorsTab);
            
            await waitFor(() => {
                expect(screen.getByText(/User Management/i)).toBeInTheDocument();
                expect(screen.getByText(/KYC Status/i)).toBeInTheDocument();
            });
        });

        it('should filter users by KYC level', async () => {
            renderWithProviders(<AdminDashboard />);
            
            const investorsTab = screen.getByText(/Investors/i);
            fireEvent.click(investorsTab);
            
            await waitFor(() => {
                const kycFilter = screen.getByLabelText(/KYC Level/i);
                fireEvent.change(kycFilter, { target: { value: 'premium' } });
                
                expect(axios.get).toHaveBeenCalledWith(
                    expect.stringContaining('kycLevel=premium'),
                    expect.any(Object)
                );
            });
        });
    });

    describe('Compliance Section', () => {
        it('should display compliance overview', async () => {
            renderWithProviders(<AdminDashboard />);
            
            const complianceTab = screen.getByText(/Compliance/i);
            fireEvent.click(complianceTab);
            
            await waitFor(() => {
                expect(screen.getByText(/KYC Compliance/i)).toBeInTheDocument();
                expect(screen.getByText(/AML Monitoring/i)).toBeInTheDocument();
                expect(screen.getByText(/Regulatory Reports/i)).toBeInTheDocument();
            });
        });

        it('should generate compliance report', async () => {
            axios.post.mockResolvedValueOnce({
                data: {
                    success: true,
                    data: {
                        reportId: 'RPT_001',
                        downloadUrl: '/api/reports/download/RPT_001'
                    }
                }
            });

            renderWithProviders(<AdminDashboard />);
            
            const complianceTab = screen.getByText(/Compliance/i);
            fireEvent.click(complianceTab);
            
            await waitFor(() => {
                const generateButton = screen.getByText(/Generate Report/i);
                fireEvent.click(generateButton);
                
                expect(axios.post).toHaveBeenCalledWith(
                    expect.stringContaining('/api/admin/compliance/report'),
                    expect.any(Object),
                    expect.any(Object)
                );
            });
        });
    });

    describe('Error Handling', () => {
        it('should display error message when API fails', async () => {
            axios.get.mockRejectedValueOnce(new Error('Network error'));
            
            renderWithProviders(<AdminDashboard />);
            
            await waitFor(() => {
                expect(screen.getByText(/Error loading dashboard data/i)).toBeInTheDocument();
            });
        });

        it('should show retry button on error', async () => {
            axios.get.mockRejectedValueOnce(new Error('Network error'));
            
            renderWithProviders(<AdminDashboard />);
            
            await waitFor(() => {
                const retryButton = screen.getByText(/Retry/i);
                expect(retryButton).toBeInTheDocument();
                
                // Mock successful response for retry
                axios.get.mockResolvedValueOnce({
                    data: {
                        success: true,
                        data: {
                            overview: {
                                totalUsers: 1543,
                                totalProperties: 87,
                                totalInvestments: 125000000,
                                platformHealth: 'optimal'
                            },
                            recent: { users: [], properties: [] }
                        }
                    }
                });
                
                fireEvent.click(retryButton);
            });
        });
    });

    describe('Logout Functionality', () => {
        it('should handle logout', async () => {
            renderWithProviders(<AdminDashboard />);
            
            const logoutButton = screen.getByText(/Logout/i);
            fireEvent.click(logoutButton);
            
            await waitFor(() => {
                expect(mockAuthContext.logout).toHaveBeenCalled();
            });
        });
    });

    describe('Real-time Updates', () => {
        it('should refresh data periodically', async () => {
            jest.useFakeTimers();
            
            renderWithProviders(<AdminDashboard />);
            
            // Initial API call
            expect(axios.get).toHaveBeenCalledTimes(1);
            
            // Fast-forward 30 seconds (assuming 30s refresh interval)
            jest.advanceTimersByTime(30000);
            
            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledTimes(2);
            });
            
            jest.useRealTimers();
        });
    });

    describe('Mobile Responsiveness', () => {
        it('should toggle sidebar on mobile', () => {
            // Mock mobile viewport
            global.innerWidth = 375;
            global.dispatchEvent(new Event('resize'));
            
            renderWithProviders(<AdminDashboard />);
            
            const menuToggle = screen.getByLabelText(/Toggle Menu/i);
            expect(menuToggle).toBeInTheDocument();
            
            fireEvent.click(menuToggle);
            
            // Sidebar should be visible
            expect(screen.getByRole('navigation')).toHaveClass('sidebar-open');
        });
    });
});