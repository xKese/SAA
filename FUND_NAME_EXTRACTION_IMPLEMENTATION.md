# Investment Universe Fund Name Extraction Implementation

## Overview
Successfully implemented Claude AI integration to extract proper fund names from PDF factsheets instead of using filenames for the investment universe securities.

## Implementation Details

### 1. Backend Changes

#### Claude Service (`server/services/claude.ts`)
- Added `extractFundNameFromFactsheet()` method that uses Claude AI to intelligently extract fund names from PDF text
- Uses focused prompts specifically designed for fund name extraction
- Returns validated fund names with high accuracy

#### Investment Universe Service (`server/services/investment-universe.ts`)
- Modified `extractFundName()` to use Claude AI with fallback to pattern matching
- Added database integration for persistent storage of extracted names
- New fields in `InvestmentUniverseItem`:
  - `extractedName`: Name extracted by Claude AI
  - `displayName`: The name to display (prioritizes extractedName)
  - `lastNameExtraction`: Timestamp of last extraction
- Implemented database synchronization methods

### 2. Database Changes

#### New Table: `investment_universe`
```sql
- id: UUID primary key
- file_name: Unique filename
- factsheet_path: Path to PDF
- extracted_name: Claude AI extracted name
- display_name: Display name
- isin: ISIN code
- asset_class: Asset classification
- category: Category (e.g., Stufe 1, 2, 3)
- confidence: Extraction confidence (0-1)
- timestamps: created_at, updated_at
```

### 3. Frontend Changes

#### Components Updated:
- `InvestmentUniverseSelector.tsx`: Now displays extracted names instead of filenames
- `TargetStructurePanel.tsx`: Uses display names for better user experience

### 4. API Endpoints

#### New Endpoint: `/api/investment-universe/refresh-names`
- POST endpoint to trigger batch extraction of fund names
- Processes all instruments without extracted names
- Returns statistics on extraction success/failure

## Test Results

Successfully tested with sample PDFs:
- ✅ "Dodge & Cox Worldwide Global Stock Fund" (extracted from complex filename)
- ✅ "VanEck Uranium and Nuclear Technologies UCITS ETF" (extracted from Morningstar report)
- ✅ "Invesco European Senior Loan Fund" (extracted from German factsheet)

## Benefits

1. **User Experience**: Clean, readable fund names instead of technical filenames
2. **Accuracy**: Claude AI understands context and extracts official fund names
3. **Persistence**: Names are stored in database for fast retrieval
4. **Scalability**: Batch processing capability for large investment universes
5. **Flexibility**: Fallback to pattern matching if AI extraction fails

## Usage

### Manual Refresh
To extract names for all funds in the investment universe:
```bash
curl -X POST http://localhost:5001/api/investment-universe/refresh-names
```

### Automatic Extraction
Names are automatically extracted when:
- New PDFs are added to the investment universe
- Enhanced instrument details are requested
- Portfolio analysis requires fund look-through

## Future Enhancements

1. Add admin UI for manual name editing
2. Implement confidence scoring for extracted names
3. Add multi-language support for international factsheets
4. Create scheduled job for periodic name updates
5. Add validation against external fund databases