import { http, HttpResponse } from 'msw';

// Mock data
const mockPortfolios = [
  {
    id: '1',
    name: 'Test Portfolio 1',
    fileName: 'portfolio1.csv',
    analysisStatus: 'completed',
    analysisProgress: 100,
    currentPhase: 'Analyse abgeschlossen',
    totalValue: '100000',
    positionCount: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2', 
    name: 'Test Portfolio 2',
    fileName: 'portfolio2.xlsx',
    analysisStatus: 'analyzing',
    analysisProgress: 60,
    currentPhase: 'Phase 2: Asset-Allokations-Aufschlüsselung',
    totalValue: '50000',
    positionCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

const mockPositions = [
  {
    id: '1',
    portfolioId: '1',
    name: 'Apple Inc.',
    isin: 'US0378331005',
    value: '25000',
    percentage: '25.0',
    instrumentType: 'Stock',
    sector: 'Technology',
    geography: 'United States',
    currency: 'USD',
    assetClass: 'Equity'
  },
  {
    id: '2',
    portfolioId: '1', 
    name: 'Microsoft Corp',
    isin: 'US5949181045',
    value: '30000',
    percentage: '30.0',
    instrumentType: 'Stock',
    sector: 'Technology',
    geography: 'United States',
    currency: 'USD',
    assetClass: 'Equity'
  }
];

export const handlers = [
  // Get all portfolios
  http.get('/api/portfolios', () => {
    return HttpResponse.json(mockPortfolios);
  }),

  // Get portfolio by ID
  http.get('/api/portfolios/:id', ({ params }) => {
    const portfolio = mockPortfolios.find(p => p.id === params.id);
    if (!portfolio) {
      return HttpResponse.json({ error: 'Portfolio nicht gefunden' }, { status: 404 });
    }
    return HttpResponse.json(portfolio);
  }),

  // Get portfolio positions
  http.get('/api/portfolios/:id/positions', ({ params }) => {
    const positions = mockPositions.filter(p => p.portfolioId === params.id);
    return HttpResponse.json(positions);
  }),

  // Get analysis phases
  http.get('/api/portfolios/:id/phases', ({ params }) => {
    const phases = [
      {
        id: '1',
        portfolioId: params.id,
        phaseNumber: 0,
        phaseName: 'Phase 0: Instrumentenidentifikation',
        status: 'completed',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      },
      {
        id: '2',
        portfolioId: params.id,
        phaseNumber: 1,
        phaseName: 'Phase 1: Portfolio-Grundlagen-Analyse',
        status: 'completed',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      }
    ];
    return HttpResponse.json(phases);
  }),

  // Preview portfolio file
  http.post('/api/portfolios/preview', async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return HttpResponse.json(
        { error: 'Keine Datei hochgeladen' }, 
        { status: 400 }
      );
    }

    // Mock successful preview response
    return HttpResponse.json({
      fileName: file.name,
      fileType: file.name.split('.').pop()?.toLowerCase() || 'unknown',
      totalPositions: 3,
      totalValue: 75000,
      validPositions: 3,
      invalidPositions: 0,
      positions: [
        {
          name: 'Apple Inc.',
          isin: 'US0378331005',
          value: 25000,
          validation: { isValid: true, errors: [] }
        },
        {
          name: 'Microsoft Corp',
          isin: 'US5949181045',
          value: 30000,
          validation: { isValid: true, errors: [] }
        },
        {
          name: 'Google Inc.',
          isin: 'US02079K3059',
          value: 20000,
          validation: { isValid: true, errors: [] }
        }
      ],
      validationErrors: [],
      warnings: [],
      canProceed: true
    });
  }),

  // Upload portfolio
  http.post('/api/portfolios/upload', async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return HttpResponse.json(
        { error: 'Keine Datei hochgeladen' }, 
        { status: 400 }
      );
    }

    // Mock successful upload response
    const newPortfolio = {
      id: '3',
      name: `Portfolio ${file.name}`,
      fileName: file.name,
      analysisStatus: 'pending' as const,
      analysisProgress: 0,
      currentPhase: 'Vorbereitung...',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json({
      portfolio: newPortfolio,
      positionCount: 3
    });
  }),

  // Delete portfolio
  http.delete('/api/portfolios/:id', ({ params }) => {
    const portfolioExists = mockPortfolios.find(p => p.id === params.id);
    if (!portfolioExists) {
      return HttpResponse.json({ error: 'Portfolio nicht gefunden' }, { status: 404 });
    }
    return HttpResponse.json({ success: true });
  }),

  // Error scenarios for testing
  http.post('/api/portfolios/preview-validation-error', () => {
    return HttpResponse.json({
      error: 'Fehler beim Verarbeiten der Datei: Position "Invalid Position" has invalid or missing value: undefined. Cannot proceed with accurate analysis.',
      validationErrors: [
        { row: 2, field: 'value', error: 'Ungültiger oder fehlender Wert' },
        { row: 3, field: 'name', error: 'Name ist erforderlich' }
      ]
    }, { status: 400 });
  }),

  http.post('/api/portfolios/upload-network-error', () => {
    return HttpResponse.json(
      { error: 'Network timeout error' },
      { status: 0 }
    );
  }),

  http.post('/api/portfolios/upload-server-error', () => {
    return HttpResponse.json(
      { error: 'Internal server error during analysis' },
      { status: 500 }
    );
  }),
];