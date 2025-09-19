import { OptimizationResult, OptimizationConstraints, RebalancingPlan } from '../../store/optimizationSlice';

const API_BASE = '/api';

export class OptimizationService {
  static async runOptimization(params: {
    portfolioId: string;
    method: OptimizationResult['method'];
    constraints: OptimizationConstraints;
  }): Promise<OptimizationResult> {
    const response = await fetch(`${API_BASE}/optimization/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error(`Failed to run optimization: ${response.statusText}`);
    }
    return response.json();
  }

  static async getOptimizations(portfolioId: string): Promise<OptimizationResult[]> {
    const response = await fetch(`${API_BASE}/optimization/portfolio/${portfolioId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch optimizations: ${response.statusText}`);
    }
    return response.json();
  }

  static async getOptimization(id: string): Promise<OptimizationResult> {
    const response = await fetch(`${API_BASE}/optimization/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch optimization: ${response.statusText}`);
    }
    return response.json();
  }

  static async cancelOptimization(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/optimization/${id}/cancel`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to cancel optimization: ${response.statusText}`);
    }
  }

  static async deleteOptimization(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/optimization/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete optimization: ${response.statusText}`);
    }
  }

  static async generateEfficientFrontier(params: {
    portfolioId: string;
    constraints: OptimizationConstraints;
    points: number;
  }): Promise<{ returns: number[]; risks: number[]; weights: { [symbol: string]: number }[] }> {
    const response = await fetch(`${API_BASE}/optimization/efficient-frontier`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error(`Failed to generate efficient frontier: ${response.statusText}`);
    }
    return response.json();
  }

  static async createRebalancingPlan(params: {
    portfolioId: string;
    targetWeights: { [symbol: string]: number };
  }): Promise<RebalancingPlan> {
    const response = await fetch(`${API_BASE}/rebalancing/plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error(`Failed to create rebalancing plan: ${response.statusText}`);
    }
    return response.json();
  }

  static async getRebalancingPlans(portfolioId: string): Promise<RebalancingPlan[]> {
    const response = await fetch(`${API_BASE}/rebalancing/portfolio/${portfolioId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch rebalancing plans: ${response.statusText}`);
    }
    return response.json();
  }

  static async executeRebalancingPlan(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/rebalancing/${id}/execute`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to execute rebalancing plan: ${response.statusText}`);
    }
  }

  static async deleteRebalancingPlan(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/rebalancing/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete rebalancing plan: ${response.statusText}`);
    }
  }
}