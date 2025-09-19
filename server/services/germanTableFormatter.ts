/**
 * German Table Formatter Service
 * Formats portfolio analysis results according to German financial standards
 */

export interface AssetAllocation {
  category: string;
  value: number;
  percentage: number;
}

export interface CurrencyExposure {
  currency: string;
  value: number;
  percentage: number;
  hedged?: boolean;
}

export interface GeographicAllocation {
  region: string;
  percentage: number;
}

export interface RiskMetric {
  name: string;
  value: number;
  unit?: string;
}

export interface ComparisonData {
  before: number;
  investment: number;
  after: number;
  percentageBefore: number;
  percentageAfter: number;
  change: number;
}

export class GermanTableFormatter {
  /**
   * Format number according to German standards
   * @param value Number to format
   * @param decimals Number of decimal places
   * @param currency Whether to format as currency
   */
  static formatNumber(value: number, decimals: number = 2, currency: boolean = false): string {
    const formatted = value.toFixed(decimals)
      .replace('.', ',')
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    if (currency) {
      return `€ ${formatted}`;
    }
    return formatted;
  }

  /**
   * Format percentage according to German standards
   */
  static formatPercentage(value: number, decimals: number = 1): string {
    return `${this.formatNumber(value, decimals)}%`;
  }

  /**
   * Create Asset Category Table (Anlagekategorie-Tabelle)
   */
  static createAssetTable(allocations: AssetAllocation[]): string {
    // Validate sum equals 100%
    const sum = allocations.reduce((acc, a) => acc + a.percentage, 0);
    if (Math.abs(sum - 100) > 0.1) {
      throw new Error(`Asset allocations sum to ${sum}%, must equal 100% ±0.1%`);
    }

    let table = '## Anlagekategorie-Tabelle\n\n';
    table += '| Anlagekategorie | Wert (€) | Anteil (%) |\n';
    table += '|-----------------|----------|------------|\n';

    const germanCategories = {
      'Equities': 'Aktien',
      'Bonds': 'Anleihen',
      'Alternatives': 'Alternative Investments',
      'Cash': 'Liquidität/Cash',
      'Commodities': 'Edelmetalle',
      'Money Market': 'Geldmarktanlagen',
      'Other': 'Sonstige'
    };

    for (const allocation of allocations) {
      const germanCategory = germanCategories[allocation.category] || allocation.category;
      table += `| ${germanCategory} | ${this.formatNumber(allocation.value, 0, true)} | ${this.formatPercentage(allocation.percentage)} |\n`;
    }

    // Add total row
    const totalValue = allocations.reduce((acc, a) => acc + a.value, 0);
    table += `| **Gesamt** | **${this.formatNumber(totalValue, 0, true)}** | **${this.formatPercentage(100, 1)}** |\n`;

    return table;
  }

  /**
   * Create Currency Table (Währungs-Tabelle)
   */
  static createCurrencyTable(exposures: CurrencyExposure[]): string {
    // Validate sum equals 100%
    const sum = exposures.reduce((acc, e) => acc + e.percentage, 0);
    if (Math.abs(sum - 100) > 0.1) {
      throw new Error(`Currency exposures sum to ${sum}%, must equal 100% ±0.1%`);
    }

    let table = '## Währungs-Tabelle\n\n';
    table += '| Währung | Wert (€) | Anteil (%) | Hedging |\n';
    table += '|---------|----------|------------|----------|\n';

    for (const exposure of exposures) {
      const hedgingStatus = exposure.hedged === true ? 'Ja' :
                           exposure.hedged === false ? 'Nein' : '-';
      table += `| ${exposure.currency} | ${this.formatNumber(exposure.value, 0, true)} | ${this.formatPercentage(exposure.percentage)} | ${hedgingStatus} |\n`;
    }

    // Add total row
    const totalValue = exposures.reduce((acc, e) => acc + e.value, 0);
    table += `| **Gesamt** | **${this.formatNumber(totalValue, 0, true)}** | **${this.formatPercentage(100, 1)}** | - |\n`;

    return table;
  }

  /**
   * Create Geographic Table (Regional-Tabelle)
   */
  static createGeographicTable(allocations: GeographicAllocation[]): string {
    // Validate sum equals 100% for equity portion
    const sum = allocations.reduce((acc, a) => acc + a.percentage, 0);
    if (Math.abs(sum - 100) > 0.1) {
      throw new Error(`Geographic allocations sum to ${sum}%, must equal 100% ±0.1%`);
    }

    let table = '## Regional-Tabelle (Aktienanteil)\n\n';
    table += '| Region | Anteil (%) |\n';
    table += '|--------|------------|\n';

    const germanRegions = {
      'USA/North America': 'USA/Nordamerika',
      'Europe': 'Europa (inkl. UK)',
      'Emerging Markets': 'Schwellenländer',
      'Asia-Pacific': 'Asien-Pazifik',
      'Cash in Equity Funds': 'Cash in Aktienfonds',
      'Other': 'Sonstige'
    };

    for (const allocation of allocations) {
      const germanRegion = germanRegions[allocation.region] || allocation.region;
      table += `| ${germanRegion} | ${this.formatPercentage(allocation.percentage)} |\n`;
    }

    table += `| **Gesamt** | **${this.formatPercentage(100, 1)}** |\n`;

    return table;
  }

  /**
   * Create Risk Metrics Table (Kennzahlen-Tabelle)
   */
  static createRiskMetricsTable(metrics: RiskMetric[]): string {
    let table = '## Kennzahlen-Tabelle\n\n';
    table += '| Kennzahl | Wert | Einheit |\n';
    table += '|----------|------|----------|\n';

    const germanMetrics = {
      'Expected Return': 'Renditeerwartung',
      'Portfolio Volatility': 'Portfolio-Volatilität',
      'Sharpe Ratio': 'Sharpe Ratio',
      'Value at Risk': 'Value-at-Risk (95%, 1 Jahr)',
      'Expected Shortfall': 'Expected Shortfall (95%, 1 Jahr)',
      'Maximum Drawdown': 'Maximum Drawdown',
      'Diversification Quotient': 'Diversifikationsquotient'
    };

    for (const metric of metrics) {
      const germanName = germanMetrics[metric.name] || metric.name;
      const unit = metric.unit || '';
      const formattedValue = metric.unit === '%' ?
        this.formatPercentage(metric.value, 2).replace('%', '') :
        this.formatNumber(metric.value, 2);

      table += `| ${germanName} | ${formattedValue} | ${unit} |\n`;
    }

    return table;
  }

  /**
   * Create Before/After Comparison Table
   */
  static createComparisonTable(
    category: string,
    data: Map<string, ComparisonData>
  ): string {
    let table = `## Vorher-Nachher-Analyse: ${category}\n\n`;
    table += '| Kategorie | Bestand vorher (€) | Neuinvestition (€) | Bestand nachher (€) | Anteil vorher (%) | Anteil nachher (%) | Veränderung (%) |\n';
    table += '|-----------|-------------------|-------------------|--------------------|-----------------|--------------------|----------------|\n';

    const germanCategories = {
      'Equities': 'Aktien',
      'Bonds': 'Anleihen',
      'Alternatives': 'Alternative Investments',
      'Cash': 'Liquidität/Cash',
      'Commodities': 'Edelmetalle',
      'Money Market': 'Geldmarktanlagen',
      'EUR': 'EUR',
      'USD': 'USD',
      'CHF': 'CHF',
      'GBP': 'GBP',
      'Other': 'Sonstige'
    };

    let totalBefore = 0;
    let totalInvestment = 0;
    let totalAfter = 0;

    for (const [key, comparison] of data) {
      const germanKey = germanCategories[key] || key;
      totalBefore += comparison.before;
      totalInvestment += comparison.investment;
      totalAfter += comparison.after;

      table += `| ${germanKey} | `;
      table += `${this.formatNumber(comparison.before, 0, true)} | `;
      table += `${this.formatNumber(comparison.investment, 0, true)} | `;
      table += `${this.formatNumber(comparison.after, 0, true)} | `;
      table += `${this.formatPercentage(comparison.percentageBefore)} | `;
      table += `${this.formatPercentage(comparison.percentageAfter)} | `;
      table += `${comparison.change >= 0 ? '+' : ''}${this.formatPercentage(comparison.change, 1)} |\n`;
    }

    // Add total row
    table += `| **Gesamt** | `;
    table += `**${this.formatNumber(totalBefore, 0, true)}** | `;
    table += `**${this.formatNumber(totalInvestment, 0, true)}** | `;
    table += `**${this.formatNumber(totalAfter, 0, true)}** | `;
    table += `**${this.formatPercentage(100, 1)}** | `;
    table += `**${this.formatPercentage(100, 1)}** | `;
    table += `- |\n`;

    return table;
  }

  /**
   * Validate all allocations sum to 100% with tolerance
   */
  static validateAllocationSum(allocations: number[], tolerance: number = 0.1): boolean {
    const sum = allocations.reduce((acc, val) => acc + val, 0);
    return Math.abs(sum - 100) <= tolerance;
  }

  /**
   * Validate "Sonstige/Nicht zugeordnet" is less than 2%
   */
  static validateSonstige(allocations: AssetAllocation[]): boolean {
    const sonstige = allocations.find(a =>
      a.category === 'Other' ||
      a.category === 'Sonstige' ||
      a.category === 'Nicht zugeordnet'
    );

    if (!sonstige) return true;
    return sonstige.percentage < 2.0;
  }

  /**
   * Apply rounding correction to ensure exact 100% sum
   */
  static applyRoundingCorrection(allocations: { percentage: number }[]): void {
    const sum = allocations.reduce((acc, a) => acc + a.percentage, 0);
    const diff = 100 - sum;

    if (Math.abs(diff) > 0.01 && Math.abs(diff) <= 0.1) {
      // Find the largest allocation and adjust it
      const largest = allocations.reduce((prev, curr) =>
        curr.percentage > prev.percentage ? curr : prev
      );
      largest.percentage += diff;
    }
  }

  /**
   * Format complete analysis output
   */
  static formatCompleteAnalysis(
    assetAllocations: AssetAllocation[],
    currencyExposures: CurrencyExposure[],
    geographicAllocations: GeographicAllocation[],
    riskMetrics: RiskMetric[]
  ): string {
    let output = '# Portfolio-Analyse nach deutschen Standards\n\n';

    try {
      // Apply rounding corrections
      this.applyRoundingCorrection(assetAllocations);
      this.applyRoundingCorrection(currencyExposures);
      this.applyRoundingCorrection(geographicAllocations);

      // Validate Sonstige
      if (!this.validateSonstige(assetAllocations)) {
        console.warn('Warning: "Sonstige" category exceeds 2% threshold');
      }

      // Create tables
      output += this.createAssetTable(assetAllocations) + '\n';
      output += this.createCurrencyTable(currencyExposures) + '\n';
      output += this.createGeographicTable(geographicAllocations) + '\n';
      output += this.createRiskMetricsTable(riskMetrics) + '\n';

      return output;
    } catch (error) {
      throw new Error(`Table formatting failed: ${error.message}`);
    }
  }
}