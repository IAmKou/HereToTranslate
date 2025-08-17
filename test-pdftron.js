const fs = require('fs');
const path = require('path');

// Test PDFTron setup
async function testPDFTron() {
  console.log('🔍 Testing PDFTron Setup...');
  
  try {
    // Check if PDFTron package is installed
    const packageJson = require('./package.json');
    const pdfTronInstalled = packageJson.dependencies && packageJson.dependencies['@pdftron/pdfnet-node'];
    
    if (pdfTronInstalled) {
      console.log('✅ PDFTron package is installed:', pdfTronInstalled);
    } else {
      console.log('❌ PDFTron package is not installed');
      return;
    }

    // Check environment variables
    const licenseKey = process.env.PDFTRON_LICENSE_KEY;
    if (licenseKey) {
      console.log('✅ PDFTron license key found in environment variables');
    } else {
      console.log('⚠️  PDFTron license key not found in environment variables');
      console.log('   Please set PDFTRON_LICENSE_KEY in your .env file');
    }

    // Try to import PDFTron
    try {
      const { PDFNet } = require('@pdftron/pdfnet-node');
      console.log('✅ PDFTron module can be imported successfully');
      
      // Test initialization (if license key is available)
      if (licenseKey) {
        try {
          await PDFNet.initialize(licenseKey);
          console.log('✅ PDFTron initialized successfully with license');
        } catch (initError) {
          console.log('❌ PDFTron initialization failed:', initError.message);
        }
      } else {
        console.log('⚠️  Skipping PDFTron initialization test (no license key)');
      }
      
    } catch (importError) {
      console.log('❌ Failed to import PDFTron module:', importError.message);
    }

    // Check if the bridge file exists
    const bridgePath = path.join(__dirname, 'apps', 'server', 'src', 'util', 'extensions', 'pdftron-bridge.ts');
    if (fs.existsSync(bridgePath)) {
      console.log('✅ PDFTron bridge file exists');
    } else {
      console.log('❌ PDFTron bridge file not found');
    }

    // Check if the module file exists
    const modulePath = path.join(__dirname, 'apps', 'server', 'src', 'util', 'extensions', 'pdftron.module.ts');
    if (fs.existsSync(modulePath)) {
      console.log('✅ PDFTron module file exists');
    } else {
      console.log('❌ PDFTron module file not found');
    }

    console.log('\n📋 PDFTron Setup Summary:');
    console.log('- Package installed:', pdfTronInstalled ? 'Yes' : 'No');
    console.log('- License key configured:', licenseKey ? 'Yes' : 'No');
    console.log('- Bridge file created:', fs.existsSync(bridgePath) ? 'Yes' : 'No');
    console.log('- Module file created:', fs.existsSync(modulePath) ? 'Yes' : 'No');
    
    if (pdfTronInstalled && licenseKey && fs.existsSync(bridgePath) && fs.existsSync(modulePath)) {
      console.log('\n🎉 PDFTron setup appears to be complete!');
      console.log('   You can now use PDFTron for enhanced PDF processing.');
    } else {
      console.log('\n⚠️  PDFTron setup is incomplete. Please check the issues above.');
    }

  } catch (error) {
    console.error('❌ Error during PDFTron setup test:', error.message);
  }
}

// Run the test
testPDFTron().catch(console.error);
