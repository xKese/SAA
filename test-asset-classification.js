// Test script to demonstrate improved asset classification
const { investmentUniverseService } = require('./server/services/investment-universe.ts');

// Test cases that should now be correctly classified as "Anleihen" instead of "Aktien"
const testInstruments = [
  { name: 'GAIA Oaktree Credit Fund', isin: 'LU1234567890' },
  { name: 'High Yield Bond ETF', isin: 'IE0012345678' },
  { name: 'Investment Grade Corporate Bonds', isin: null },
  { name: 'Fixed Income Fund EUR', isin: null },
  { name: 'European Government Bonds', isin: null },
  { name: 'MSCI World Equity', isin: null }, // Should still be "Aktien"
];

async function testAssetClassification() {
  console.log('🔍 Testing improved asset classification...\n');
  
  for (const instrument of testInstruments) {
    try {
      const assetClass = await investmentUniverseService.getAssetClassForInstrument(
        instrument.name, 
        instrument.isin
      );
      
      console.log(`${instrument.name}`);
      console.log(`  ISIN: ${instrument.isin || 'N/A'}`);
      console.log(`  Asset Class: ${assetClass || 'Sonstiges'}`);
      console.log('---');
    } catch (error) {
      console.error(`Error testing ${instrument.name}:`, error.message);
    }
  }
  
  console.log('\n📊 Expected results:');
  console.log('• GAIA Oaktree Credit Fund -> Anleihen (from pattern)');
  console.log('• High Yield Bond ETF -> Anleihen (from pattern)');
  console.log('• Investment Grade Corporate Bonds -> Anleihen (from pattern)');
  console.log('• Fixed Income Fund EUR -> Anleihen (from pattern)');
  console.log('• European Government Bonds -> Anleihen (from pattern)');
  console.log('• MSCI World Equity -> Aktien (from pattern)');
}

if (require.main === module) {
  testAssetClassification().catch(console.error);
}

module.exports = { testAssetClassification };