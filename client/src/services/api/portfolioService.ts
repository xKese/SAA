import { Portfolio, Position } from '../../store/portfolioSlice';

const API_BASE = '/api';

export class PortfolioService {
  static async getAllPortfolios(): Promise<Portfolio[]> {
    const response = await fetch(`${API_BASE}/portfolios`);
    if (!response.ok) {
      throw new Error(`Failed to fetch portfolios: ${response.statusText}`);
    }
    return response.json();
  }

  static async getPortfolio(id: string): Promise<Portfolio> {
    const response = await fetch(`${API_BASE}/portfolios/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch portfolio: ${response.statusText}`);
    }
    return response.json();
  }

  static async createPortfolio(data: FormData): Promise<Portfolio> {
    const response = await fetch(`${API_BASE}/portfolios`, {
      method: 'POST',
      body: data,
    });
    if (!response.ok) {
      throw new Error(`Failed to create portfolio: ${response.statusText}`);
    }
    return response.json();
  }

  static async updatePortfolio(id: string, data: Partial<Portfolio>): Promise<Portfolio> {
    const response = await fetch(`${API_BASE}/portfolios/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to update portfolio: ${response.statusText}`);
    }
    return response.json();
  }

  static async deletePortfolio(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/portfolios/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete portfolio: ${response.statusText}`);
    }
  }

  static async analyzePortfolio(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/portfolios/${id}/analyze`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to analyze portfolio: ${response.statusText}`);
    }
  }

  static async getAnalysisPhase(id: string, phase: number): Promise<any> {
    const response = await fetch(`${API_BASE}/portfolios/${id}/analysis/${phase}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch analysis phase: ${response.statusText}`);
    }
    return response.json();
  }

  static async updatePosition(portfolioId: string, position: Position): Promise<Position> {
    const response = await fetch(`${API_BASE}/portfolios/${portfolioId}/positions/${position.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(position),
    });
    if (!response.ok) {
      throw new Error(`Failed to update position: ${response.statusText}`);
    }
    return response.json();
  }

  static async addPosition(portfolioId: string, position: Omit<Position, 'id'>): Promise<Position> {
    const response = await fetch(`${API_BASE}/portfolios/${portfolioId}/positions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(position),
    });
    if (!response.ok) {
      throw new Error(`Failed to add position: ${response.statusText}`);
    }
    return response.json();
  }

  static async removePosition(portfolioId: string, positionId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/portfolios/${portfolioId}/positions/${positionId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to remove position: ${response.statusText}`);
    }
  }
}