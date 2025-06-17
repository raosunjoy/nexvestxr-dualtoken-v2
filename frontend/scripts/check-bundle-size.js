// NexVestXR Frontend Bundle Size Checker
// Enforces bundle size limits and performance budgets

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BundleSizeChecker {
  constructor() {
    this.buildDir = path.join(__dirname, '../build');
    this.budgetPath = path.join(__dirname, '../performance-budget.json');
    this.budget = this.loadBudget();
    this.results = {
      passed: [],
      failed: [],
      warnings: []
    };
  }

  // Load performance budget
  loadBudget() {
    const defaultBudget = {
      maxBundleSize: 2 * 1024 * 1024,     // 2MB
      maxJSSize: 1.5 * 1024 * 1024,       // 1.5MB
      maxCSSSize: 200 * 1024,             // 200KB
      maxChunkSize: 500 * 1024,           // 500KB
      maxAssetSize: 1024 * 1024,          // 1MB
      gzipRatio: 0.3                      // Expected gzip compression ratio
    };

    try {
      if (fs.existsSync(this.budgetPath)) {
        const budget = JSON.parse(fs.readFileSync(this.budgetPath, 'utf8'));
        return { ...defaultBudget, ...this.parseBudgetSizes(budget) };
      }
    } catch (error) {
      console.log('⚠️  Failed to load budget, using defaults');
    }

    return defaultBudget;
  }

  // Parse human-readable sizes to bytes
  parseBudgetSizes(budget) {
    const parseSize = (size) => {
      if (typeof size === 'number') return size;
      if (typeof size === 'string') {
        const match = size.match(/^(\d+(?:\.\d+)?)\s*(KB|MB|GB)?$/i);
        if (match) {
          const value = parseFloat(match[1]);
          const unit = (match[2] || '').toUpperCase();
          switch (unit) {
            case 'KB': return value * 1024;
            case 'MB': return value * 1024 * 1024;
            case 'GB': return value * 1024 * 1024 * 1024;
            default: return value;
          }
        }
      }
      return 0;
    };

    return {
      maxBundleSize: parseSize(budget.maxBundleSize),
      maxJSSize: parseSize(budget.maxJSSize),
      maxCSSSize: parseSize(budget.maxCSSSize),
      maxChunkSize: parseSize(budget.maxChunkSize),
      maxAssetSize: parseSize(budget.maxAssetSize)
    };
  }

  // Format bytes to human readable
  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Check if build exists
  checkBuildExists() {
    if (!fs.existsSync(this.buildDir)) {
      console.log('❌ Build directory not found. Run npm run build first.');
      process.exit(1);
    }
  }

  // Get file sizes recursively
  getFileSize(filePath) {
    const stats = fs.statSync(filePath);
    return stats.size;
  }

  // Get total directory size
  getDirectorySize(dirPath) {
    let totalSize = 0;
    
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        totalSize += this.getDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    }
    
    return totalSize;
  }

  // Check JavaScript bundle sizes
  checkJavaScriptBundles() {
    console.log('\n📦 Checking JavaScript Bundle Sizes');
    console.log('====================================');

    const jsDir = path.join(this.buildDir, 'static/js');
    if (!fs.existsSync(jsDir)) {
      this.results.failed.push({
        check: 'JavaScript bundles',
        reason: 'JS directory not found'
      });
      return;
    }

    const jsFiles = fs.readdirSync(jsDir).filter(file => file.endsWith('.js'));
    let totalJSSize = 0;

    jsFiles.forEach(file => {
      const filePath = path.join(jsDir, file);
      const size = this.getFileSize(filePath);
      totalJSSize += size;

      const status = size <= this.budget.maxChunkSize ? '✅' : '❌';
      const sizeFormatted = this.formatSize(size);
      const limitFormatted = this.formatSize(this.budget.maxChunkSize);

      console.log(`   ${status} ${file}: ${sizeFormatted} (limit: ${limitFormatted})`);

      if (size > this.budget.maxChunkSize) {
        this.results.failed.push({
          check: `JS chunk: ${file}`,
          actual: size,
          limit: this.budget.maxChunkSize,
          reason: `Exceeds chunk size limit by ${this.formatSize(size - this.budget.maxChunkSize)}`
        });
      } else {
        this.results.passed.push({
          check: `JS chunk: ${file}`,
          size: size
        });
      }
    });

    // Check total JS size
    const totalStatus = totalJSSize <= this.budget.maxJSSize ? '✅' : '❌';
    const totalSizeFormatted = this.formatSize(totalJSSize);
    const totalLimitFormatted = this.formatSize(this.budget.maxJSSize);

    console.log(`\n   ${totalStatus} Total JavaScript: ${totalSizeFormatted} (limit: ${totalLimitFormatted})`);

    if (totalJSSize > this.budget.maxJSSize) {
      this.results.failed.push({
        check: 'Total JavaScript size',
        actual: totalJSSize,
        limit: this.budget.maxJSSize,
        reason: `Exceeds JS size limit by ${this.formatSize(totalJSSize - this.budget.maxJSSize)}`
      });
    } else {
      this.results.passed.push({
        check: 'Total JavaScript size',
        size: totalJSSize
      });
    }

    return totalJSSize;
  }

  // Check CSS bundle sizes
  checkCSSBundles() {
    console.log('\n🎨 Checking CSS Bundle Sizes');
    console.log('=============================');

    const cssDir = path.join(this.buildDir, 'static/css');
    if (!fs.existsSync(cssDir)) {
      console.log('   ℹ️  No CSS directory found');
      return 0;
    }

    const cssFiles = fs.readdirSync(cssDir).filter(file => file.endsWith('.css'));
    let totalCSSSize = 0;

    cssFiles.forEach(file => {
      const filePath = path.join(cssDir, file);
      const size = this.getFileSize(filePath);
      totalCSSSize += size;

      const status = size <= this.budget.maxCSSSize ? '✅' : '❌';
      const sizeFormatted = this.formatSize(size);
      const limitFormatted = this.formatSize(this.budget.maxCSSSize);

      console.log(`   ${status} ${file}: ${sizeFormatted} (limit: ${limitFormatted})`);

      if (size > this.budget.maxCSSSize) {
        this.results.failed.push({
          check: `CSS file: ${file}`,
          actual: size,
          limit: this.budget.maxCSSSize,
          reason: `Exceeds CSS size limit by ${this.formatSize(size - this.budget.maxCSSSize)}`
        });
      } else {
        this.results.passed.push({
          check: `CSS file: ${file}`,
          size: size
        });
      }
    });

    const totalStatus = totalCSSSize <= this.budget.maxCSSSize ? '✅' : '❌';
    const totalSizeFormatted = this.formatSize(totalCSSSize);
    const totalLimitFormatted = this.formatSize(this.budget.maxCSSSize);

    console.log(`\n   ${totalStatus} Total CSS: ${totalSizeFormatted} (limit: ${totalLimitFormatted})`);

    return totalCSSSize;
  }

  // Check asset sizes
  checkAssets() {
    console.log('\n🖼️  Checking Asset Sizes');
    console.log('========================');

    const mediaDir = path.join(this.buildDir, 'static/media');
    if (!fs.existsSync(mediaDir)) {
      console.log('   ℹ️  No media directory found');
      return 0;
    }

    const mediaFiles = fs.readdirSync(mediaDir);
    let totalAssetSize = 0;
    let largeAssets = 0;

    mediaFiles.forEach(file => {
      const filePath = path.join(mediaDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isFile()) {
        const size = stats.size;
        totalAssetSize += size;

        const status = size <= this.budget.maxAssetSize ? '✅' : '❌';
        const sizeFormatted = this.formatSize(size);
        const limitFormatted = this.formatSize(this.budget.maxAssetSize);

        console.log(`   ${status} ${file}: ${sizeFormatted} (limit: ${limitFormatted})`);

        if (size > this.budget.maxAssetSize) {
          largeAssets++;
          this.results.failed.push({
            check: `Asset: ${file}`,
            actual: size,
            limit: this.budget.maxAssetSize,
            reason: `Exceeds asset size limit by ${this.formatSize(size - this.budget.maxAssetSize)}`
          });
        } else {
          this.results.passed.push({
            check: `Asset: ${file}`,
            size: size
          });
        }
      }
    });

    console.log(`\n   📊 Total Assets: ${this.formatSize(totalAssetSize)}`);
    if (largeAssets > 0) {
      console.log(`   ⚠️  Large assets found: ${largeAssets}`);
    }

    return totalAssetSize;
  }

  // Check total bundle size
  checkTotalBundleSize(jsSize, cssSize, assetSize) {
    console.log('\n📊 Checking Total Bundle Size');
    console.log('==============================');

    const totalSize = jsSize + cssSize + assetSize;
    const status = totalSize <= this.budget.maxBundleSize ? '✅' : '❌';
    const sizeFormatted = this.formatSize(totalSize);
    const limitFormatted = this.formatSize(this.budget.maxBundleSize);

    console.log(`   ${status} Total Bundle: ${sizeFormatted} (limit: ${limitFormatted})`);

    if (totalSize > this.budget.maxBundleSize) {
      this.results.failed.push({
        check: 'Total bundle size',
        actual: totalSize,
        limit: this.budget.maxBundleSize,
        reason: `Exceeds total bundle limit by ${this.formatSize(totalSize - this.budget.maxBundleSize)}`
      });
    } else {
      this.results.passed.push({
        check: 'Total bundle size',
        size: totalSize
      });
    }

    // Estimate gzipped size
    const estimatedGzipSize = totalSize * this.budget.gzipRatio;
    console.log(`   📦 Estimated Gzipped: ${this.formatSize(estimatedGzipSize)}`);

    return totalSize;
  }

  // Check for gzipped files
  checkGzipCompression() {
    console.log('\n🗜️  Checking Gzip Compression');
    console.log('=============================');

    const staticDir = path.join(this.buildDir, 'static');
    
    // Check for .gz files
    const checkGzFiles = (dir, level = 0) => {
      if (!fs.existsSync(dir)) return [];
      
      const gzFiles = [];
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory() && level < 2) {
          gzFiles.push(...checkGzFiles(filePath, level + 1));
        } else if (file.endsWith('.gz')) {
          gzFiles.push(filePath);
        }
      }
      
      return gzFiles;
    };

    const gzFiles = checkGzFiles(staticDir);
    
    if (gzFiles.length > 0) {
      console.log(`   ✅ Found ${gzFiles.length} gzipped files`);
      gzFiles.forEach(file => {
        const relativePath = path.relative(this.buildDir, file);
        console.log(`      📦 ${relativePath}`);
      });
    } else {
      console.log('   ⚠️  No gzipped files found');
      this.results.warnings.push({
        check: 'Gzip compression',
        reason: 'No .gz files found. Consider enabling gzip compression.'
      });
    }
  }

  // Generate size report
  generateSizeReport() {
    console.log('\n📋 Bundle Size Report');
    console.log('=====================');

    const totalChecks = this.results.passed.length + this.results.failed.length;
    const passRate = ((this.results.passed.length / totalChecks) * 100).toFixed(1);

    console.log(`✅ Passed: ${this.results.passed.length}`);
    console.log(`❌ Failed: ${this.results.failed.length}`);
    console.log(`⚠️  Warnings: ${this.results.warnings.length}`);
    console.log(`📊 Pass Rate: ${passRate}%`);

    if (this.results.failed.length > 0) {
      console.log('\n❌ Failed Checks:');
      this.results.failed.forEach((fail, index) => {
        console.log(`   ${index + 1}. ${fail.check}`);
        console.log(`      Reason: ${fail.reason}`);
        if (fail.actual && fail.limit) {
          console.log(`      Actual: ${this.formatSize(fail.actual)}`);
          console.log(`      Limit: ${this.formatSize(fail.limit)}`);
        }
      });
    }

    if (this.results.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.results.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning.check}: ${warning.reason}`);
      });
    }

    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      budget: this.budget,
      results: this.results,
      summary: {
        totalChecks,
        passed: this.results.passed.length,
        failed: this.results.failed.length,
        warnings: this.results.warnings.length,
        passRate: parseFloat(passRate)
      }
    };

    const reportPath = path.join(__dirname, '../bundle-size-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved: ${reportPath}`);

    return report;
  }

  // Run complete size check
  check() {
    console.log('🎯 NexVestXR Bundle Size Checker');
    console.log('================================');

    this.checkBuildExists();

    const jsSize = this.checkJavaScriptBundles();
    const cssSize = this.checkCSSBundles();
    const assetSize = this.checkAssets();
    
    this.checkTotalBundleSize(jsSize, cssSize, assetSize);
    this.checkGzipCompression();

    const report = this.generateSizeReport();

    // Exit with error code if checks failed
    if (this.results.failed.length > 0) {
      console.log('\n💥 Bundle size check failed!');
      console.log('   Consider optimizing your bundle before deployment.');
      process.exit(1);
    } else {
      console.log('\n🎉 All bundle size checks passed!');
      process.exit(0);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const checker = new BundleSizeChecker();
  checker.check();
}

module.exports = BundleSizeChecker;