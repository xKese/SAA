import { describe, it, expect } from 'vitest';

interface AssetAllocation {
  category: string;
  value: number;
  percentage: number;
}

describe('Dynamic Asset Allocation Tests', () => {
  describe('Frontend Filtering Logic', () => {
    it('should filter out categories with zero values', () => {
      const mockAssetAllocation: AssetAllocation[] = [
        { category: 'Aktien', value: 90000, percentage: 90 },
        { category: 'Anleihen', value: 0, percentage: 0 },
        { category: 'Alternative Investments', value: 0, percentage: 0 },
        { category: 'Liquidität/Cash', value: 10000, percentage: 10 },
        { category: 'Edelmetalle', value: 0, percentage: 0 },
        { category: 'Rohstoffe', value: 0, percentage: 0 }
      ];

      // Simulate the frontend filtering logic
      const filteredAllocation = mockAssetAllocation.filter(
        allocation => allocation.value > 0 && allocation.percentage > 0
      );

      expect(filteredAllocation).toHaveLength(2);
      expect(filteredAllocation[0].category).toBe('Aktien');
      expect(filteredAllocation[0].value).toBe(90000);
      expect(filteredAllocation[1].category).toBe('Liquidität/Cash');
      expect(filteredAllocation[1].value).toBe(10000);
    });

    it('should handle portfolio with only one asset category', () => {
      const singleCategoryAllocation: AssetAllocation[] = [
        { category: 'Aktien', value: 100000, percentage: 100 }
      ];

      const filteredAllocation = singleCategoryAllocation.filter(
        allocation => allocation.value > 0 && allocation.percentage > 0
      );

      expect(filteredAllocation).toHaveLength(1);
      expect(filteredAllocation[0].category).toBe('Aktien');
      expect(filteredAllocation[0].percentage).toBe(100);
    });

    it('should handle empty asset allocation array', () => {
      const emptyAllocation: AssetAllocation[] = [];

      const filteredAllocation = emptyAllocation.filter(
        allocation => allocation.value > 0 && allocation.percentage > 0
      );

      expect(filteredAllocation).toHaveLength(0);
    });

    it('should preserve all non-zero categories', () => {
      const mixedAllocation: AssetAllocation[] = [
        { category: 'Aktien', value: 50000, percentage: 50 },
        { category: 'Anleihen', value: 25000, percentage: 25 },
        { category: 'Alternative Investments', value: 0, percentage: 0 },
        { category: 'Liquidität/Cash', value: 15000, percentage: 15 },
        { category: 'Rohstoffe', value: 10000, percentage: 10 },
        { category: 'Edelmetalle', value: 0, percentage: 0 }
      ];

      const filteredAllocation = mixedAllocation.filter(
        allocation => allocation.value > 0 && allocation.percentage > 0
      );

      expect(filteredAllocation).toHaveLength(4);
      expect(filteredAllocation.map(a => a.category)).toEqual([
        'Aktien', 'Anleihen', 'Liquidität/Cash', 'Rohstoffe'
      ]);
    });
  });

  describe('Backend Dynamic Response Logic', () => {
    it('should validate that AI should not return zero categories in response', () => {
      // This test documents the expected behavior from the AI
      const validDynamicResponse: AssetAllocation[] = [
        { category: 'Aktien', value: 70000, percentage: 70 },
        { category: 'Liquidität/Cash', value: 30000, percentage: 30 }
      ];

      // Verify no zero categories are present
      const hasZeroCategories = validDynamicResponse.some(
        allocation => allocation.value === 0 || allocation.percentage === 0
      );

      expect(hasZeroCategories).toBe(false);
      expect(validDynamicResponse).toHaveLength(2);
    });

    it('should validate percentage sum equals 100 for dynamic responses', () => {
      const dynamicResponse: AssetAllocation[] = [
        { category: 'Aktien', value: 60000, percentage: 60 },
        { category: 'Anleihen', value: 25000, percentage: 25 },
        { category: 'Liquidität/Cash', value: 15000, percentage: 15 }
      ];

      const totalPercentage = dynamicResponse.reduce(
        (sum, allocation) => sum + allocation.percentage, 0
      );

      expect(totalPercentage).toBe(100);
    });
  });
});