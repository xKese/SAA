import { ClaudePortfolioAnalysisService } from './server/services/claude.ts';

// Test the SAA integration with a simple portfolio
async function testSAAIntegration() {
  console.log('🎯 Testing SAA Integration...\n');

  try {
    const claudeService = new ClaudePortfolioAnalysisService();
    
    // Test portfolio with sample positions
    const testPositions = [
      {
        name: 'GAIA Oaktree Credit Fund',
        isin: 'LU1234567890',
        value: 50000,
        instrumentType: 'Fund'
      },
      {
        name: 'MSCI World Equity ETF',
        isin: 'IE0012345678',
        value: 100000,
        instrumentType: 'ETF'
      },
      {
        name: 'European Government Bonds',
        isin: null,
        value: 30000,
        instrumentType: 'Fund'
      }
    ];

    console.log('📊 Test portfolio positions:', testPositions);
    console.log('\n🔄 Starting SAA analysis...');

    // Test the SAA analysis method
    const saaResults = await claudeService.analyzePortfolioWithSAAPrompt(
      'test-portfolio-001',
      testPositions
    );

    console.log('\n✅ SAA Analysis Results:');
    console.log('- Has results:', !!saaResults);
    console.log('- Has error:', !!saaResults?.error);
    console.log('- Has fallback:', !!saaResults?.fallbackAnalysis);
    
    if (saaResults?.metadata) {
      console.log('- Total Value:', saaResults.metadata.totalValue);
      console.log('- Position Count:', saaResults.metadata.positionCount);
    }

    if (saaResults?.summary) {
      console.log('- Summary Available:', true);
      console.log('- Overall Rating:', saaResults.summary.overallRating);
    }

    if (saaResults?.phase1) {
      console.log('- Phase 1 (Instrument ID):', !!saaResults.phase1);
    }

    if (saaResults?.phase2) {
      console.log('- Phase 2 (Asset Allocation):', !!saaResults.phase2);
    }

    console.log('\n🎉 SAA integration test completed!');
    
    return saaResults;

  } catch (error) {
    console.error('❌ SAA integration test failed:', error);
    console.error('Error details:', error.message);
    throw error;
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSAAIntegration()
    .then(() => {
      console.log('\n✨ All tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

export { testSAAIntegration };