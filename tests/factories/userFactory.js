const { faker } = require('@faker-js/faker');
const bcrypt = require('bcryptjs');

// UAE-specific data
const UAE_EMIRATES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Fujairah', 'Ras Al Khaimah', 'Umm Al Quwain'];
const UAE_ZONES = [
  'Downtown Dubai', 'Dubai Marina', 'Business Bay', 'JLT', 'DIFC', 'Palm Jumeirah',
  'Dubai Hills', 'Arabian Ranches', 'Mirdif', 'Al Reem Island', 'Yas Island', 'Saadiyat Island'
];
const GCC_COUNTRIES = ['AE', 'SA', 'QA', 'KW', 'BH', 'OM'];
const INVESTMENT_TIERS = ['retail', 'premium', 'institutional'];
const KYC_LEVELS = ['standard', 'enhanced', 'comprehensive'];
const RESIDENCY_STATUS = ['citizen', 'resident', 'visitor', 'investor_visa'];

class UserFactory {
  /**
   * Create a basic UAE user
   */
  static async createUAEUser(overrides = {}) {
    const emirate = faker.helpers.arrayElement(UAE_EMIRATES);
    const isUAEResident = faker.datatype.boolean(0.7); // 70% UAE residents
    const isGCCResident = isUAEResident || faker.datatype.boolean(0.2);
    
    const userData = {
      id: faker.datatype.uuid(),
      email: faker.internet.email().toLowerCase(),
      phone: {
        countryCode: '+971',
        number: '5' + faker.datatype.number({ min: 10000000, max: 99999999 }),
        verified: faker.datatype.boolean(0.8)
      },
      password: {
        hash: await bcrypt.hash('TestPass123!', 12),
        lastChanged: faker.date.recent(30)
      },
      
      profile: {
        firstName: {
          en: faker.name.firstName(),
          ar: faker.helpers.maybe(() => faker.name.firstName(), 0.6)
        },
        lastName: {
          en: faker.name.lastName(),
          ar: faker.helpers.maybe(() => faker.name.lastName(), 0.6)
        },
        dateOfBirth: faker.date.birthdate({ min: 18, max: 70, mode: 'age' }),
        gender: faker.helpers.arrayElement(['male', 'female', 'other']),
        nationality: isGCCResident ? faker.helpers.arrayElement(GCC_COUNTRIES) : faker.address.countryCode(),
        profilePicture: faker.image.avatar()
      },
      
      location: {
        country: isUAEResident ? 'AE' : faker.address.countryCode(),
        city: isUAEResident ? faker.helpers.arrayElement(['Dubai', 'Abu Dhabi', 'Sharjah']) : faker.address.city(),
        emirate: isUAEResident ? emirate : null,
        address: {
          street: faker.address.streetAddress(),
          building: faker.datatype.number({ min: 1, max: 200 }).toString(),
          apartment: faker.datatype.number({ min: 101, max: 9999 }).toString(),
          area: isUAEResident ? faker.helpers.arrayElement(UAE_ZONES) : faker.address.county(),
          poBox: faker.datatype.number({ min: 1000, max: 99999 }).toString()
        },
        residencyStatus: isUAEResident ? 
          faker.helpers.arrayElement(['citizen', 'resident']) : 
          faker.helpers.arrayElement(RESIDENCY_STATUS)
      },
      
      userType: faker.helpers.arrayElement(['consumer', 'property_owner', 'developer', 'institutional']),
      
      investmentProfile: {
        tier: faker.helpers.arrayElement(INVESTMENT_TIERS),
        riskTolerance: faker.helpers.arrayElement(['conservative', 'moderate', 'aggressive']),
        investmentGoals: faker.helpers.arrayElements(
          ['capital_appreciation', 'rental_income', 'portfolio_diversification', 'speculation'],
          faker.datatype.number({ min: 1, max: 3 })
        ),
        totalInvested: faker.datatype.number({ min: 0, max: 5000000 }),
        portfolioValue: faker.datatype.number({ min: 0, max: 6000000 }),
        preferredPropertyTypes: faker.helpers.arrayElements(
          ['apartment', 'villa', 'townhouse', 'office', 'retail'],
          faker.datatype.number({ min: 1, max: 3 })
        ),
        preferredLocations: faker.helpers.arrayElements(UAE_ZONES, faker.datatype.number({ min: 1, max: 4 }))
      },
      
      preferences: {
        currency: {
          primary: faker.helpers.arrayElement(['AED', 'USD', 'EUR', 'SAR']),
          display: 'AED',
          autoDetect: faker.datatype.boolean()
        },
        language: {
          primary: faker.helpers.arrayElement(['en', 'ar']),
          rtlMode: faker.datatype.boolean(0.4)
        },
        notifications: {
          email: faker.datatype.boolean(0.9),
          sms: faker.datatype.boolean(0.7),
          push: faker.datatype.boolean(0.8),
          frequency: faker.helpers.arrayElement(['immediate', 'daily', 'weekly']),
          types: {
            propertyUpdates: faker.datatype.boolean(0.9),
            priceAlerts: faker.datatype.boolean(0.8),
            dividends: faker.datatype.boolean(0.95),
            marketing: faker.datatype.boolean(0.3)
          }
        }
      },
      
      kyc: {
        status: faker.helpers.arrayElement(['pending', 'submitted', 'approved', 'rejected']),
        level: faker.helpers.arrayElement(KYC_LEVELS),
        documents: {
          emirates_id: {
            submitted: isUAEResident ? faker.datatype.boolean(0.8) : false,
            verified: isUAEResident ? faker.datatype.boolean(0.7) : false,
            expiryDate: isUAEResident ? faker.date.future(5) : null,
            number: isUAEResident ? '784-' + faker.datatype.number({ min: 1000, max: 9999 }) + '-' + 
              faker.datatype.number({ min: 1000000, max: 9999999 }) + '-' + 
              faker.datatype.number({ min: 10, max: 99 }) : null
          },
          passport: {
            submitted: faker.datatype.boolean(0.9),
            verified: faker.datatype.boolean(0.8),
            expiryDate: faker.date.future(10),
            number: faker.datatype.alphaNumeric(9).toUpperCase(),
            issuingCountry: faker.address.countryCode()
          }
        },
        aml: {
          checked: faker.datatype.boolean(0.7),
          checkedDate: faker.date.recent(30),
          status: faker.helpers.arrayElement(['clear', 'flagged', 'under_investigation']),
          riskScore: faker.datatype.number({ min: 0, max: 100 }),
          pepCheck: faker.datatype.boolean(0.05), // 5% chance of being PEP
          sanctionsCheck: faker.datatype.boolean(0.98) // 98% pass sanctions check
        }
      },
      
      financial: {
        annualIncome: {
          amount: faker.datatype.number({ min: 50000, max: 2000000 }),
          currency: 'AED',
          verified: faker.datatype.boolean(0.6)
        },
        employmentStatus: faker.helpers.arrayElement(['employed', 'self_employed', 'retired']),
        employer: {
          name: faker.company.name(),
          industry: faker.helpers.arrayElement(['finance', 'technology', 'healthcare', 'real_estate', 'government']),
          position: faker.name.jobTitle()
        }
      },
      
      limits: this.generateInvestmentLimits(faker.helpers.arrayElement(INVESTMENT_TIERS)),
      
      flags: {
        emailVerified: faker.datatype.boolean(0.8),
        phoneVerified: faker.datatype.boolean(0.7),
        kycCompleted: faker.datatype.boolean(0.6),
        investmentEligible: faker.datatype.boolean(0.5),
        riskAssessed: faker.datatype.boolean(0.4),
        complianceCleared: faker.datatype.boolean(0.5)
      },
      
      status: faker.helpers.arrayElement(['active', 'pending_verification', 'suspended']),
      
      createdAt: faker.date.recent(365),
      updatedAt: faker.date.recent(30),
      lastActiveAt: faker.date.recent(7),
      
      ...overrides
    };
    
    return userData;
  }
  
  /**
   * Create a KYC-approved UAE investor
   */
  static async createApprovedInvestor(overrides = {}) {
    const baseUser = await this.createUAEUser();
    
    return {
      ...baseUser,
      kyc: {
        ...baseUser.kyc,
        status: 'approved',
        level: faker.helpers.arrayElement(['enhanced', 'comprehensive']),
        documents: {
          emirates_id: {
            submitted: true,
            verified: true,
            expiryDate: faker.date.future(5),
            number: '784-' + faker.datatype.number({ min: 1000, max: 9999 }) + '-' + 
              faker.datatype.number({ min: 1000000, max: 9999999 }) + '-' + 
              faker.datatype.number({ min: 10, max: 99 })
          },
          passport: {
            submitted: true,
            verified: true,
            expiryDate: faker.date.future(10),
            number: faker.datatype.alphaNumeric(9).toUpperCase(),
            issuingCountry: 'AE'
          },
          salary_certificate: {
            submitted: true,
            verified: true,
            employer: faker.company.name(),
            salary: faker.datatype.number({ min: 100000, max: 500000 })
          }
        },
        aml: {
          checked: true,
          checkedDate: faker.date.recent(30),
          status: 'clear',
          riskScore: faker.datatype.number({ min: 0, max: 40 }),
          pepCheck: false,
          sanctionsCheck: true
        }
      },
      flags: {
        emailVerified: true,
        phoneVerified: true,
        kycCompleted: true,
        investmentEligible: true,
        riskAssessed: true,
        complianceCleared: true
      },
      status: 'active',
      ...overrides
    };
  }
  
  /**
   * Create a high-net-worth institutional investor
   */
  static async createInstitutionalInvestor(overrides = {}) {
    const baseUser = await this.createApprovedInvestor();
    
    return {
      ...baseUser,
      userType: 'institutional',
      investmentProfile: {
        ...baseUser.investmentProfile,
        tier: 'institutional',
        totalInvested: faker.datatype.number({ min: 5000000, max: 50000000 }),
        portfolioValue: faker.datatype.number({ min: 6000000, max: 60000000 })
      },
      kyc: {
        ...baseUser.kyc,
        level: 'comprehensive',
        documents: {
          ...baseUser.kyc.documents,
          trade_license: {
            submitted: true,
            verified: true,
            licenseNumber: 'CN-' + faker.datatype.number({ min: 1000000, max: 9999999 }),
            issuingAuthority: 'Dubai Department of Economic Development'
          },
          bank_statement: {
            submitted: true,
            verified: true,
            bankName: faker.helpers.arrayElement(['Emirates NBD', 'ADCB', 'FAB', 'HSBC UAE']),
            months: 6
          }
        }
      },
      financial: {
        ...baseUser.financial,
        annualIncome: {
          amount: faker.datatype.number({ min: 1000000, max: 10000000 }),
          currency: 'AED',
          verified: true
        },
        netWorth: {
          amount: faker.datatype.number({ min: 10000000, max: 100000000 }),
          currency: 'AED',
          lastUpdated: faker.date.recent(90)
        }
      },
      limits: this.generateInvestmentLimits('institutional'),
      ...overrides
    };
  }
  
  /**
   * Create a developer user
   */
  static async createDeveloper(overrides = {}) {
    const baseUser = await this.createApprovedInvestor();
    
    return {
      ...baseUser,
      userType: 'developer',
      profile: {
        ...baseUser.profile,
        bio: {
          en: 'Leading real estate developer in UAE',
          ar: 'مطور عقاري رائد في دولة الإمارات العربية المتحدة'
        }
      },
      kyc: {
        ...baseUser.kyc,
        level: 'comprehensive',
        documents: {
          ...baseUser.kyc.documents,
          trade_license: {
            submitted: true,
            verified: true,
            licenseNumber: 'RL-' + faker.datatype.number({ min: 1000, max: 9999 }),
            issuingAuthority: 'Real Estate Regulatory Agency (RERA)'
          }
        }
      },
      ...overrides
    };
  }
  
  /**
   * Generate investment limits based on tier
   */
  static generateInvestmentLimits(tier) {
    const limits = {
      retail: {
        daily: { investment: 50000, withdrawal: 25000, trading: 100000 },
        monthly: { investment: 500000, withdrawal: 250000 },
        annual: { investment: 2000000, withdrawal: 1000000 }
      },
      premium: {
        daily: { investment: 200000, withdrawal: 100000, trading: 500000 },
        monthly: { investment: 2000000, withdrawal: 1000000 },
        annual: { investment: 10000000, withdrawal: 5000000 }
      },
      institutional: {
        daily: { investment: 1000000, withdrawal: 500000, trading: 2000000 },
        monthly: { investment: 10000000, withdrawal: 5000000 },
        annual: { investment: 50000000, withdrawal: 25000000 }
      }
    };
    
    const tierLimits = limits[tier] || limits.retail;
    
    return {
      daily: tierLimits.daily,
      monthly: tierLimits.monthly,
      annual: tierLimits.annual,
      used: {
        dailyInvestment: 0,
        dailyWithdrawal: 0,
        dailyTrading: 0,
        lastReset: new Date()
      }
    };
  }
  
  /**
   * Create multiple users
   */
  static async createMultiple(count, type = 'basic', overrides = {}) {
    const users = [];
    
    for (let i = 0; i < count; i++) {
      let user;
      
      switch (type) {
        case 'approved':
          user = await this.createApprovedInvestor(overrides);
          break;
        case 'institutional':
          user = await this.createInstitutionalInvestor(overrides);
          break;
        case 'developer':
          user = await this.createDeveloper(overrides);
          break;
        default:
          user = await this.createUAEUser(overrides);
      }
      
      users.push(user);
    }
    
    return users;
  }
}

module.exports = UserFactory;