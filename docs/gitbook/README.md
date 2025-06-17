# 🚀 NexVestXR V2 Dual Token Platform

**The World's First Dual-Blockchain Real Estate Tokenization Platform**

## 🏗️ Platform Overview

NexVestXR V2 is a revolutionary dual-token real estate tokenization platform that bridges traditional property investment with modern blockchain technology. The platform integrates **XERA (XRPL)** and **PROPX (Flare Network)** tokens to serve both small developers/landowners and premium institutional developers.

### Key Markets
- **🇮🇳 Indian Market**: Complete implementation with city pools and premium developers
- **🇦🇪 UAE Market**: Full dual token integration with AED-based pricing and compliance

### Dual Token Architecture
- **XERA Token**: Diversified property pools with governance and staking
- **PROPX Token**: Individual premium property tokenization
- **Automatic Classification**: Smart routing based on property value and location

## 🚀 Quick Start

### For Developers
- [Development Setup](./developer-guide/setup.md)
- [API Documentation](./api/overview.md)
- [Smart Contract Integration](./blockchain/smart-contracts.md)

### For Users
- [User Guide](./user-guide/getting-started.md)
- [Investment Process](./user-guide/investment-process.md)
- [Currency Exchange](./user-guide/multi-currency.md)

### For Administrators
- [Admin Dashboard](./admin/dashboard.md)
- [Compliance Management](./admin/compliance.md)
- [System Monitoring](./admin/monitoring.md)

## 🌍 Localization

This platform supports:
- **English** (Primary)
- **Arabic** (عربي) with RTL layout
- **Multi-Currency** with AED focus

## 📚 Documentation Sections

### Technical Documentation
- [Architecture Overview](./architecture/overview.md)
- [Database Schema](./architecture/database.md)
- [API Reference](./api/README.md)
- [Frontend Components](./frontend/README.md)
- [Mobile App](./mobile/README.md)
- [Smart Contracts](./blockchain/README.md)

### Business Documentation
- [UAE Market Analysis](./business/market-analysis.md)
- [Investment Tiers](./business/investment-tiers.md)
- [Compliance Framework](./business/compliance.md)
- [Fee Structure](./business/fees.md)

### Deployment & Operations
- [CI/CD Pipeline](./deployment/cicd.md)
- [AWS Infrastructure](./deployment/aws.md)
- [Monitoring & Logging](./deployment/monitoring.md)
- [Security Guidelines](./deployment/security.md)

## 🎯 Key Features

### Multi-Currency System
```javascript
// Supported Currencies
const currencies = {
  primary: 'AED',        // UAE Dirham
  gcc: ['SAR', 'QAR', 'KWD', 'OMR', 'BHD'],
  international: ['USD', 'EUR', 'GBP', 'SGD'],
  emerging: ['INR']
}
```

### Property Types
- **Residential**: Apartments, Villas, Townhouses, Penthouses
- **Commercial**: Offices, Retail Spaces
- **Industrial**: Warehouses, Industrial Units
- **Hospitality**: Hotel Apartments

### Investment Tiers
- **Retail**: AED 25K - 500K (Local investors)
- **Premium**: AED 500K - 2M (GCC investors)
- **Institutional**: AED 2M+ (International investors)

## 🔗 Important Links

- **Production**: https://www.propxchange.ae
- **Staging**: https://staging.propxchange.ae
- **API**: https://api.propxchange.ae
- **Admin Panel**: https://admin.propxchange.ae
- **Mobile Apps**: [iOS](https://apps.apple.com/ae/app/propxchange) | [Android](https://play.google.com/store/apps/details?id=com.propxchange.uae)

## 📞 Support

- **Developer Support**: dev@propxchange.ae
- **Technical Issues**: [GitHub Issues](https://github.com/propxchange/uae-platform/issues)
- **Business Inquiries**: business@propxchange.ae
- **Compliance Questions**: compliance@propxchange.ae

---

**Version**: 2.0.0-UAE  
**Last Updated**: {{ gitbook.time }}  
**Language**: {{ gitbook.language }}