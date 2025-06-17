const { faker } = require('@faker-js/faker');

// UAE-specific property data
const UAE_EMIRATES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Fujairah', 'Ras Al Khaimah', 'Umm Al Quwain'];

const DUBAI_ZONES = [
  'Downtown Dubai', 'Dubai Marina', 'Business Bay', 'Jumeirah Lake Towers',
  'DIFC', 'Palm Jumeirah', 'Dubai Hills', 'Arabian Ranches', 'Mirdif',
  'Jumeirah', 'Bur Dubai', 'Deira', 'Al Barsha', 'Motor City'
];

const ABU_DHABI_ZONES = [
  'Al Reem Island', 'Yas Island', 'Saadiyat Island', 'Al Maryah Island',
  'Corniche Area', 'Al Khalidiyah', 'Al Zahiyah', 'Masdar City',
  'Al Reef', 'Khalifa City', 'Mohammed Bin Zayed City'
];

const PROPERTY_TYPES = ['apartment', 'villa', 'townhouse', 'penthouse', 'office', 'retail', 'warehouse', 'hotel_apartment'];
const PROPERTY_CATEGORIES = ['residential', 'commercial', 'industrial', 'hospitality'];

const DEVELOPERS = [
  { id: 'emaar', name: { en: 'Emaar Properties', ar: 'إعمار العقارية' } },
  { id: 'meraas', name: { en: 'Meraas', ar: 'مراس' } },
  { id: 'nakheel', name: { en: 'Nakheel', ar: 'نخيل' } },
  { id: 'damac', name: { en: 'DAMAC Properties', ar: 'داماك العقارية' } },
  { id: 'sobha', name: { en: 'Sobha Realty', ar: 'صوبا العقارية' } },
  { id: 'aldar', name: { en: 'Aldar Properties', ar: 'الدار العقارية' } },
  { id: 'majid_al_futtaim', name: { en: 'Majid Al Futtaim', ar: 'ماجد الفطيم' } }
];

const AMENITIES = [
  'swimming_pool', 'gym', 'sauna', 'steam_room', 'jacuzzi', 'children_play_area',
  'bbq_area', 'garden', 'balcony', 'maid_room', 'study_room', 'storage_room',
  'laundry_room', 'security', 'concierge', 'valet_parking', 'business_center'
];

class PropertyFactory {
  /**
   * Create a basic UAE property
   */
  static createUAEProperty(overrides = {}) {
    const emirate = faker.helpers.arrayElement(UAE_EMIRATES);
    const zone = emirate === 'Dubai' ? 
      faker.helpers.arrayElement(DUBAI_ZONES) : 
      emirate === 'Abu Dhabi' ? 
        faker.helpers.arrayElement(ABU_DHABI_ZONES) : 
        faker.address.county();
    
    const propertyType = faker.helpers.arrayElement(PROPERTY_TYPES);
    const isResidential = ['apartment', 'villa', 'townhouse', 'penthouse', 'hotel_apartment'].includes(propertyType);
    const category = isResidential ? 'residential' : 
      ['office', 'retail'].includes(propertyType) ? 'commercial' : 'industrial';
    
    const developer = faker.helpers.arrayElement(DEVELOPERS);
    const totalValue = faker.datatype.number({ min: 500000, max: 50000000 });
    const totalSupply = faker.datatype.number({ min: 1000, max: 100000 });
    const pricePerToken = Math.floor(totalValue / totalSupply);
    
    const property = {
      id: faker.datatype.uuid(),
      reraRegistrationNumber: `RERA-${emirate.substring(0, 3).toUpperCase()}-${faker.datatype.number({ min: 2020, max: 2024 })}-${faker.datatype.number({ min: 1000, max: 9999 })}`,
      dldTitleDeedNumber: `DLD-${faker.datatype.number({ min: 100000, max: 999999 })}-${faker.datatype.number({ min: 2020, max: 2024 })}`,
      
      title: {
        en: this.generatePropertyTitle(propertyType, zone, 'en'),
        ar: this.generatePropertyTitle(propertyType, zone, 'ar')
      },
      
      description: {
        en: this.generatePropertyDescription(propertyType, zone, developer.name.en, 'en'),
        ar: this.generatePropertyDescription(propertyType, zone, developer.name.ar, 'ar')
      },
      
      location: {
        emirate,
        city: emirate,
        zone,
        address: {
          en: `${faker.address.streetName()}, ${zone}, ${emirate}`,
          ar: `${faker.address.streetName()}، ${zone}، ${emirate}`
        },
        coordinates: {
          latitude: emirate === 'Dubai' ? 
            faker.datatype.number({ min: 24.8, max: 25.3, precision: 0.0001 }) :
            faker.datatype.number({ min: 24.2, max: 24.5, precision: 0.0001 }),
          longitude: emirate === 'Dubai' ? 
            faker.datatype.number({ min: 54.9, max: 55.5, precision: 0.0001 }) :
            faker.datatype.number({ min: 54.3, max: 54.7, precision: 0.0001 })
        }
      },
      
      propertyType,
      category,
      
      specifications: this.generateSpecifications(propertyType),
      
      valuation: {
        aed: totalValue,
        usd: Math.floor(totalValue / 3.67),
        eur: Math.floor(totalValue / 4.06),
        gbp: Math.floor(totalValue / 4.67),
        sar: Math.floor(totalValue / 0.98),
        qar: Math.floor(totalValue / 1.01),
        pricePerSqft: faker.datatype.number({ min: 800, max: 3000 }),
        lastUpdated: faker.date.recent(30)
      },
      
      tokenization: {
        totalSupply,
        availableSupply: faker.datatype.number({ min: 0, max: totalSupply }),
        tokenPrice: {
          aed: pricePerToken,
          usd: Math.floor(pricePerToken / 3.67),
          eur: Math.floor(pricePerToken / 4.06)
        },
        minimumInvestment: {
          aed: faker.helpers.arrayElement([100, 500, 1000, 5000]),
          retail: faker.helpers.arrayElement([25000, 50000, 100000]),
          premium: faker.helpers.arrayElement([500000, 1000000]),
          institutional: faker.helpers.arrayElement([2000000, 5000000])
        }
      },
      
      investmentTiers: {
        retail: {
          minAmount: 25000,
          maxAmount: 500000,
          kycLevel: 'standard'
        },
        premium: {
          minAmount: 500000,
          maxAmount: 2000000,
          kycLevel: 'enhanced'
        },
        institutional: {
          minAmount: 2000000,
          kycLevel: 'comprehensive'
        }
      },
      
      developer: {
        id: developer.id,
        name: developer.name,
        verified: true,
        reraLicense: `DEV-${faker.datatype.number({ min: 1000, max: 9999 })}`,
        contact: {
          email: faker.internet.email(),
          phone: '+971-4-' + faker.datatype.number({ min: 1000000, max: 9999999 }),
          website: `https://www.${developer.id}.com`
        }
      },
      
      media: {
        images: this.generatePropertyImages(propertyType, zone),
        videos: [
          {
            url: `https://cdn.propexchange.ae/videos/${faker.datatype.uuid()}.mp4`,
            type: 'walkthrough',
            duration: faker.datatype.number({ min: 60, max: 300 })
          }
        ],
        virtualTour: `https://tour.propexchange.ae/properties/${faker.datatype.uuid()}`,
        floorPlans: this.generateFloorPlans(propertyType)
      },
      
      amenities: faker.helpers.arrayElements(AMENITIES, faker.datatype.number({ min: 3, max: 10 })),
      
      compliance: {
        rera: {
          registrationNumber: `RERA-${emirate.substring(0, 3).toUpperCase()}-${faker.datatype.number({ min: 2020, max: 2024 })}-${faker.datatype.number({ min: 1000, max: 9999 })}`,
          status: faker.helpers.arrayElement(['active', 'pending', 'expired']),
          registered: faker.datatype.boolean(0.9),
          expiryDate: faker.date.future(3),
          verifiedBy: 'Real Estate Regulatory Agency'
        },
        dld: {
          titleDeedNumber: `DLD-${faker.datatype.number({ min: 100000, max: 999999 })}-${faker.datatype.number({ min: 2020, max: 2024 })}`,
          registered: faker.datatype.boolean(0.85),
          ownershipType: faker.helpers.arrayElement(['freehold', 'leasehold']),
          registrationDate: faker.date.past(2)
        },
        escb: {
          approved: faker.datatype.boolean(0.8),
          projectNumber: `ESCB-${faker.datatype.number({ min: 100000, max: 999999 })}`,
          completionCertificate: faker.datatype.boolean(0.7)
        }
      },
      
      investment: {
        totalRaised: faker.datatype.number({ min: 0, max: totalValue }),
        totalInvestors: faker.datatype.number({ min: 0, max: 1000 }),
        fundingProgress: faker.datatype.number({ min: 0, max: 100, precision: 0.01 }),
        expectedROI: faker.datatype.number({ min: 8, max: 18, precision: 0.1 }),
        rentalYield: faker.datatype.number({ min: 5, max: 12, precision: 0.1 }),
        expectedCompletion: faker.date.future(3),
        fundingDeadline: faker.date.future(1)
      },
      
      metrics: {
        views: faker.datatype.number({ min: 0, max: 10000 }),
        saves: faker.datatype.number({ min: 0, max: 1000 }),
        shares: faker.datatype.number({ min: 0, max: 500 }),
        inquiries: faker.datatype.number({ min: 0, max: 200 }),
        lastUpdated: faker.date.recent(7)
      },
      
      status: faker.helpers.arrayElement(['active', 'pending_approval', 'under_construction', 'completed', 'sold_out']),
      
      createdAt: faker.date.past(1),
      updatedAt: faker.date.recent(30),
      
      ...overrides
    };
    
    return property;
  }
  
  /**
   * Create a fully funded property
   */
  static createFundedProperty(overrides = {}) {
    const baseProperty = this.createUAEProperty();
    
    return {
      ...baseProperty,
      tokenization: {
        ...baseProperty.tokenization,
        availableSupply: 0
      },
      investment: {
        ...baseProperty.investment,
        totalRaised: baseProperty.valuation.aed,
        fundingProgress: 100,
        totalInvestors: faker.datatype.number({ min: 50, max: 500 })
      },
      status: 'completed',
      ...overrides
    };
  }
  
  /**
   * Create a high-value luxury property
   */
  static createLuxuryProperty(overrides = {}) {
    const baseProperty = this.createUAEProperty();
    const luxuryValue = faker.datatype.number({ min: 10000000, max: 100000000 });
    
    return {
      ...baseProperty,
      title: {
        en: `Luxury ${baseProperty.propertyType} in ${baseProperty.location.zone}`,
        ar: `${baseProperty.propertyType} فاخر في ${baseProperty.location.zone}`
      },
      valuation: {
        ...baseProperty.valuation,
        aed: luxuryValue,
        usd: Math.floor(luxuryValue / 3.67),
        eur: Math.floor(luxuryValue / 4.06),
        pricePerSqft: faker.datatype.number({ min: 2000, max: 5000 })
      },
      specifications: {
        ...baseProperty.specifications,
        bedrooms: faker.datatype.number({ min: 4, max: 8 }),
        bathrooms: faker.datatype.number({ min: 4, max: 10 }),
        area: faker.datatype.number({ min: 3000, max: 10000 }),
        parkingSpaces: faker.datatype.number({ min: 2, max: 6 })
      },
      amenities: [
        ...baseProperty.amenities,
        'private_pool', 'home_cinema', 'wine_cellar', 'smart_home', 'private_elevator'
      ],
      investment: {
        ...baseProperty.investment,
        expectedROI: faker.datatype.number({ min: 10, max: 20, precision: 0.1 }),
        rentalYield: faker.datatype.number({ min: 6, max: 15, precision: 0.1 })
      },
      ...overrides
    };
  }
  
  /**
   * Create a commercial property
   */
  static createCommercialProperty(overrides = {}) {
    const baseProperty = this.createUAEProperty();
    
    return {
      ...baseProperty,
      propertyType: faker.helpers.arrayElement(['office', 'retail', 'warehouse']),
      category: 'commercial',
      specifications: {
        area: faker.datatype.number({ min: 500, max: 5000 }),
        floors: faker.datatype.number({ min: 1, max: 10 }),
        parkingSpaces: faker.datatype.number({ min: 5, max: 50 }),
        loadingBays: faker.datatype.number({ min: 0, max: 5 }),
        ceiling_height: faker.datatype.number({ min: 3, max: 8, precision: 0.1 })
      },
      amenities: [
        'security', 'concierge', 'business_center', 'conference_rooms', 
        'high_speed_internet', 'backup_power', 'central_ac'
      ],
      investment: {
        ...baseProperty.investment,
        expectedROI: faker.datatype.number({ min: 12, max: 25, precision: 0.1 }),
        rentalYield: faker.datatype.number({ min: 8, max: 20, precision: 0.1 })
      },
      ...overrides
    };
  }
  
  /**
   * Generate property specifications based on type
   */
  static generateSpecifications(propertyType) {
    const isResidential = ['apartment', 'villa', 'townhouse', 'penthouse', 'hotel_apartment'].includes(propertyType);
    
    if (isResidential) {
      return {
        bedrooms: faker.datatype.number({ min: 1, max: 6 }),
        bathrooms: faker.datatype.number({ min: 1, max: 8 }),
        area: faker.datatype.number({ min: 500, max: 5000 }),
        balconyArea: faker.datatype.number({ min: 0, max: 200 }),
        parkingSpaces: faker.datatype.number({ min: 1, max: 3 }),
        floor: faker.datatype.number({ min: 1, max: 50 }),
        furnished: faker.datatype.boolean(0.3),
        view: faker.helpers.arrayElement(['sea', 'city', 'garden', 'pool', 'golf', 'burj_khalifa'])
      };
    } else {
      return {
        area: faker.datatype.number({ min: 200, max: 2000 }),
        floors: faker.datatype.number({ min: 1, max: 5 }),
        parkingSpaces: faker.datatype.number({ min: 2, max: 20 }),
        furnished: faker.datatype.boolean(0.5),
        airConditioning: true,
        security: true
      };
    }
  }
  
  /**
   * Generate property images
   */
  static generatePropertyImages(propertyType, zone) {
    const imageCount = faker.datatype.number({ min: 5, max: 15 });
    const images = [];
    
    for (let i = 0; i < imageCount; i++) {
      images.push({
        url: `https://cdn.propexchange.ae/images/${faker.datatype.uuid()}.jpg`,
        alt: `${propertyType} in ${zone} - Image ${i + 1}`,
        type: faker.helpers.arrayElement(['exterior', 'interior', 'bedroom', 'bathroom', 'kitchen', 'living_room', 'view']),
        order: i
      });
    }
    
    return images;
  }
  
  /**
   * Generate floor plans
   */
  static generateFloorPlans(propertyType) {
    const planCount = faker.datatype.number({ min: 1, max: 3 });
    const plans = [];
    
    for (let i = 0; i < planCount; i++) {
      plans.push({
        url: `https://cdn.propexchange.ae/floorplans/${faker.datatype.uuid()}.pdf`,
        type: faker.helpers.arrayElement(['ground_floor', 'first_floor', 'second_floor', 'penthouse']),
        area: faker.datatype.number({ min: 500, max: 2000 })
      });
    }
    
    return plans;
  }
  
  /**
   * Generate property title
   */
  static generatePropertyTitle(propertyType, zone, language) {
    if (language === 'ar') {
      const typeMap = {
        apartment: 'شقة',
        villa: 'فيلا',
        townhouse: 'منزل مدرج',
        penthouse: 'بنتهاوس',
        office: 'مكتب',
        retail: 'متجر'
      };
      return `${typeMap[propertyType] || propertyType} فاخرة في ${zone}`;
    } else {
      return `Luxury ${propertyType} in ${zone}`;
    }
  }
  
  /**
   * Generate property description
   */
  static generatePropertyDescription(propertyType, zone, developer, language) {
    if (language === 'ar') {
      return `${propertyType} استثنائية من تطوير ${developer} في ${zone}. استثمار مثالي مع عوائد مضمونة وموقع متميز.`;
    } else {
      return `Exceptional ${propertyType} by ${developer} in ${zone}. Prime investment opportunity with guaranteed returns and premium location.`;
    }
  }
  
  /**
   * Create multiple properties
   */
  static createMultiple(count, type = 'basic', overrides = {}) {
    const properties = [];
    
    for (let i = 0; i < count; i++) {
      let property;
      
      switch (type) {
        case 'funded':
          property = this.createFundedProperty(overrides);
          break;
        case 'luxury':
          property = this.createLuxuryProperty(overrides);
          break;
        case 'commercial':
          property = this.createCommercialProperty(overrides);
          break;
        default:
          property = this.createUAEProperty(overrides);
      }
      
      properties.push(property);
    }
    
    return properties;
  }
}

module.exports = PropertyFactory;