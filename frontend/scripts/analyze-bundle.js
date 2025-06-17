// NexVestXR Frontend Bundle Analysis Script
// Analyzes bundle size, identifies optimization opportunities

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BundleAnalyzer {
  constructor() {
    this.buildDir = path.join(__dirname, '../build');
    this.staticDir = path.join(this.buildDir, 'static');
    this.jsDir = path.join(this.staticDir, 'js');
    this.cssDir = path.join(this.staticDir, 'css');
    this.analysis = {
      totalSize: 0,
      jsSize: 0,
      cssSize: 0,
      chunks: [],
      recommendations: []
    };
  }

  // Analyze JavaScript bundles
  analyzeJavaScript() {
    console.log('\n📦 Analyzing JavaScript Bundles');
    console.log('=================================');

    if (!fs.existsSync(this.jsDir)) {
      console.log('❌ Build directory not found. Run npm run build first.');
      return;
    }

    const jsFiles = fs.readdirSync(this.jsDir).filter(file => file.endsWith('.js'));
    
    jsFiles.forEach(file => {
      const filePath = path.join(this.jsDir, file);
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      
      let chunkType = 'Unknown';
      if (file.includes('main')) chunkType = 'Main Bundle';
      else if (file.includes('vendor') || file.includes('runtime')) chunkType = 'Vendor/Runtime';
      else if (file.match(/\d+/)) chunkType = 'Code Split Chunk';
      
      this.analysis.chunks.push({
        file,
        type: chunkType,
        size: stats.size,
        sizeKB: parseFloat(sizeKB)
      });
      
      this.analysis.jsSize += stats.size;
      
      console.log(`   📄 ${file}: ${sizeKB} KB (${chunkType})`);
      
      // Flag large bundles
      if (stats.size > 500 * 1024) { // 500KB
        console.log(`   ⚠️  Large bundle detected: ${sizeKB} KB`);
        this.analysis.recommendations.push({
          type: 'size',
          file,
          issue: `Large bundle size: ${sizeKB} KB`,
          solution: 'Consider code splitting or removing unused dependencies'
        });
      }
    });

    console.log(`\n📊 Total JavaScript: ${(this.analysis.jsSize / 1024).toFixed(2)} KB`);
  }

  // Analyze CSS bundles
  analyzeCSS() {
    console.log('\n🎨 Analyzing CSS Bundles');
    console.log('=========================');

    if (!fs.existsSync(this.cssDir)) {
      console.log('⚠️  No CSS directory found');
      return;
    }

    const cssFiles = fs.readdirSync(this.cssDir).filter(file => file.endsWith('.css'));
    
    cssFiles.forEach(file => {
      const filePath = path.join(this.cssDir, file);
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      
      this.analysis.cssSize += stats.size;
      
      console.log(`   🎨 ${file}: ${sizeKB} KB`);
      
      // Flag large CSS files
      if (stats.size > 100 * 1024) { // 100KB
        console.log(`   ⚠️  Large CSS file: ${sizeKB} KB`);
        this.analysis.recommendations.push({
          type: 'css',
          file,
          issue: `Large CSS file: ${sizeKB} KB`,
          solution: 'Consider CSS purging or splitting'
        });
      }
    });

    console.log(`\n📊 Total CSS: ${(this.analysis.cssSize / 1024).toFixed(2)} KB`);
  }

  // Analyze dependencies
  analyzeDependencies() {
    console.log('\n📚 Analyzing Dependencies');
    console.log('==========================');

    try {
      const packagePath = path.join(__dirname, '../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      const dependencies = Object.keys(packageJson.dependencies || {});
      const devDependencies = Object.keys(packageJson.devDependencies || {});
      
      console.log(`   📦 Production Dependencies: ${dependencies.length}`);
      console.log(`   🛠️  Development Dependencies: ${devDependencies.length}`);
      
      // Check for common large dependencies
      const largeDependencies = [
        'lodash', 'moment', 'rxjs', 'angular', 'vue', 
        'material-ui', 'antd', 'semantic-ui-react'
      ];
      
      const foundLarge = dependencies.filter(dep => 
        largeDependencies.some(large => dep.includes(large))
      );
      
      if (foundLarge.length > 0) {
        console.log('\n   ⚠️  Potentially large dependencies found:');
        foundLarge.forEach(dep => {
          console.log(`      - ${dep}`);
          this.analysis.recommendations.push({
            type: 'dependency',
            file: dep,
            issue: 'Potentially large dependency',
            solution: 'Consider tree shaking or lighter alternatives'
          });
        });
      }
      
    } catch (error) {
      console.log('   ❌ Failed to analyze dependencies:', error.message);
    }
  }

  // Check for duplicate dependencies
  checkDuplicates() {
    console.log('\n🔍 Checking for Duplicate Dependencies');
    console.log('======================================');

    try {
      // This would require webpack-bundle-analyzer in a real scenario
      console.log('   ℹ️  To check for duplicate dependencies:');
      console.log('   1. Run: npm run build:analyze');
      console.log('   2. Look for duplicate modules in the analyzer');
      console.log('   3. Consider using webpack optimization.splitChunks');
      
    } catch (error) {
      console.log('   ❌ Failed to check duplicates:', error.message);
    }
  }

  // Generate optimization recommendations
  generateRecommendations() {
    console.log('\n💡 Optimization Recommendations');
    console.log('================================');

    // Size-based recommendations
    const totalSizeMB = (this.analysis.totalSize / (1024 * 1024)).toFixed(2);
    
    if (this.analysis.totalSize > 2 * 1024 * 1024) { // 2MB
      this.analysis.recommendations.push({
        type: 'general',
        issue: `Large total bundle size: ${totalSizeMB} MB`,
        solution: 'Implement code splitting and lazy loading'
      });
    }

    // JavaScript specific recommendations
    if (this.analysis.jsSize > 1.5 * 1024 * 1024) { // 1.5MB
      this.analysis.recommendations.push({
        type: 'javascript',
        issue: 'Large JavaScript bundle',
        solution: 'Split code by routes, use React.lazy() for components'
      });
    }

    // General recommendations
    const generalRecommendations = [
      {
        category: 'Code Splitting',
        recommendations: [
          'Implement route-based code splitting',
          'Use React.lazy() for large components',
          'Split vendor libraries into separate chunks'
        ]
      },
      {
        category: 'Tree Shaking',
        recommendations: [
          'Import only needed functions from lodash',
          'Use ES6 imports for better tree shaking',
          'Remove unused dependencies'
        ]
      },
      {
        category: 'Asset Optimization',
        recommendations: [
          'Compress images with tools like imagemin',
          'Use WebP format for images',
          'Implement lazy loading for images'
        ]
      },
      {
        category: 'Caching',
        recommendations: [
          'Configure proper cache headers',
          'Use service workers for caching',
          'Implement CDN for static assets'
        ]
      }
    ];

    generalRecommendations.forEach(category => {
      console.log(`\n   📋 ${category.category}:`);
      category.recommendations.forEach(rec => {
        console.log(`      • ${rec}`);
      });
    });

    // Specific recommendations from analysis
    if (this.analysis.recommendations.length > 0) {
      console.log('\n   🎯 Specific Issues Found:');
      this.analysis.recommendations.forEach((rec, index) => {
        console.log(`      ${index + 1}. ${rec.issue}`);
        console.log(`         Solution: ${rec.solution}`);
      });
    }
  }

  // Generate webpack optimization config
  generateWebpackConfig() {
    console.log('\n⚙️  Generating Webpack Optimization Config');
    console.log('==========================================');

    const webpackConfig = `
// Webpack Optimization Configuration for NexVestXR
const path = require('path');
const CompressionPlugin = require('compression-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const webpackOptimization = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\\\/]node_modules[\\\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10
        },
        react: {
          test: /[\\\\/]node_modules[\\\\/](react|react-dom)[\\\\/]/,
          name: 'react',
          chunks: 'all',
          priority: 20
        },
        ui: {
          test: /[\\\\/]node_modules[\\\\/](lucide-react|framer-motion)[\\\\/]/,
          name: 'ui',
          chunks: 'all',
          priority: 15
        },
        charts: {
          test: /[\\\\/]node_modules[\\\\/](recharts|d3)[\\\\/]/,
          name: 'charts',
          chunks: 'all',
          priority: 15
        }
      }
    },
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true
          }
        }
      })
    ]
  },
  plugins: [
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@services': path.resolve(__dirname, 'src/services')
    }
  }
};

module.exports = webpackOptimization;`;

    fs.writeFileSync(
      path.join(__dirname, '../webpack.optimization.js'),
      webpackConfig
    );

    console.log('   ✅ Generated webpack.optimization.js');
    console.log('   📝 To use: merge this config with your webpack config');
  }

  // Generate performance budget
  generatePerformanceBudget() {
    console.log('\n🎯 Performance Budget');
    console.log('=====================');

    const budget = {
      maxBundleSize: '2MB',
      maxJSSize: '1.5MB',
      maxCSSSize: '200KB',
      maxChunkSize: '500KB',
      maxAssetSize: '1MB',
      targets: {
        lighthouse: {
          performance: 90,
          accessibility: 95,
          bestPractices: 95,
          seo: 95
        },
        webVitals: {
          lcp: '2.5s',      // Largest Contentful Paint
          fid: '100ms',     // First Input Delay
          cls: '0.1',       // Cumulative Layout Shift
          fcp: '1.8s',      // First Contentful Paint
          ttfb: '600ms'     // Time to First Byte
        }
      }
    };

    console.log('   📊 Bundle Size Limits:');
    console.log(`      • Total Bundle: ${budget.maxBundleSize}`);
    console.log(`      • JavaScript: ${budget.maxJSSize}`);
    console.log(`      • CSS: ${budget.maxCSSSize}`);
    console.log(`      • Individual Chunks: ${budget.maxChunkSize}`);
    
    console.log('\n   🏃 Performance Targets:');
    console.log(`      • Lighthouse Performance: ${budget.targets.lighthouse.performance}+`);
    console.log(`      • Largest Contentful Paint: < ${budget.targets.webVitals.lcp}`);
    console.log(`      • First Input Delay: < ${budget.targets.webVitals.fid}`);
    console.log(`      • Cumulative Layout Shift: < ${budget.targets.webVitals.cls}`);

    // Save budget as JSON
    fs.writeFileSync(
      path.join(__dirname, '../performance-budget.json'),
      JSON.stringify(budget, null, 2)
    );

    console.log('\n   ✅ Performance budget saved to performance-budget.json');
  }

  // Run complete analysis
  analyze() {
    console.log('🔍 NexVestXR Frontend Bundle Analysis');
    console.log('====================================');

    this.analyzeJavaScript();
    this.analyzeCSS();
    this.analyzeDependencies();
    this.checkDuplicates();
    
    this.analysis.totalSize = this.analysis.jsSize + this.analysis.cssSize;
    
    console.log(`\n📊 Bundle Analysis Summary`);
    console.log('==========================');
    console.log(`Total Size: ${(this.analysis.totalSize / 1024).toFixed(2)} KB`);
    console.log(`JavaScript: ${(this.analysis.jsSize / 1024).toFixed(2)} KB`);
    console.log(`CSS: ${(this.analysis.cssSize / 1024).toFixed(2)} KB`);
    console.log(`Chunks: ${this.analysis.chunks.length}`);

    this.generateRecommendations();
    this.generateWebpackConfig();
    this.generatePerformanceBudget();

    // Save analysis report
    const reportPath = path.join(__dirname, '../bundle-analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.analysis, null, 2));
    console.log(`\n📄 Analysis report saved: ${reportPath}`);

    return this.analysis;
  }
}

// Run analysis if called directly
if (require.main === module) {
  const analyzer = new BundleAnalyzer();
  
  try {
    analyzer.analyze();
    console.log('\n🎉 Bundle analysis completed successfully!');
  } catch (error) {
    console.error(`❌ Bundle analysis failed: ${error.message}`);
    process.exit(1);
  }
}

module.exports = BundleAnalyzer;