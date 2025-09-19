// Re-export calculation utilities
export { RiskCalculator } from './riskMetrics';
export type { RiskMetrics } from './riskMetrics';

// Performance calculation utilities
export const calculateReturns = (prices: number[]): number[] => {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  return returns;
};

export const calculateTotalReturn = (startValue: number, endValue: number): number => {
  return (endValue - startValue) / startValue;
};

export const calculateAnnualizedReturn = (totalReturn: number, years: number): number => {
  return Math.pow(1 + totalReturn, 1 / years) - 1;
};

export const calculateCompoundAnnualGrowthRate = (startValue: number, endValue: number, years: number): number => {
  return Math.pow(endValue / startValue, 1 / years) - 1;
};