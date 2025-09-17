#!/usr/bin/env node

/**
 * Test script for fund name extraction using Claude AI
 */

import { investmentUniverseService } from './server/services/investment-universe.js';
import { claudeService } from './server/services/claude.js';

console.log('🧪 Testing Fund Name Extraction with Claude AI');
console.log('='.repeat(50));

async function testFundNameExtraction() {
  try {
    console.log('\n1. Loading Investment Universe...');
    const universe = await investmentUniverseService.getInvestmentUniverse(true);
    console.log(`✅ Loaded ${universe.totalCount} instruments`);
    
    // Test with a few sample instruments
    const samplesToTest = universe.instruments.slice(0, 3);
    
    console.log(`\n2. Testing name extraction for ${samplesToTest.length} sample instruments...\n`);
    
    for (const instrument of samplesToTest) {
      console.log(`📄 File: ${instrument.fileName}`);
      console.log(`   Original name: ${instrument.name}`);
      
      // Get enhanced details which triggers name extraction
      const enhanced = await investmentUniverseService.getEnhancedInstrumentDetails(
        instrument.name,
        instrument.isin
      );
      
      if (enhanced) {
        console.log(`   ✅ Extracted name: ${enhanced.extractedName || 'N/A'}`);
        console.log(`   Display name: ${enhanced.displayName}`);
        console.log(`   Confidence: ${(enhanced.confidence * 100).toFixed(0)}%`);
      } else {
        console.log(`   ❌ Failed to get enhanced details`);
      }
      
      console.log('');
    }
    
    // Check database persistence
    console.log('3. Checking database persistence...');
    const refreshedUniverse = await investmentUniverseService.getInvestmentUniverse(false);
    const extractedCount = refreshedUniverse.instruments.filter(i => i.extractedName).length;
    console.log(`✅ ${extractedCount} instruments have extracted names in database`);
    
    console.log('\n✨ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testFundNameExtraction().catch(console.error);