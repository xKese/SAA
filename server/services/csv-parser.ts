import Papa from "papaparse";

interface ParsedPosition {
  name: string;
  isin?: string;
  value: number;
}

interface ParseResult {
  positions: ParsedPosition[];
  totalValue: number;
}

export async function parseCSV(fileContent: string): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        try {
          const positions: ParsedPosition[] = [];
          let totalValue = 0;

          for (const row of result.data as any[]) {
            // Try to identify name column
            const name = row.Name || row.Ticker || row.Symbol || row.Bezeichnung || row.Position || "";
            
            // Try to identify ISIN column
            const isin = row.ISIN || row.WKN || row.Wertpapierkennnummer || "";
            
            // Try to identify value column
            let value = 0;
            const valueStr = row.Value || row.Wert || row["Market Value"] || row.Marktwert || row.Betrag || "0";
            
            // Parse German or English number format
            if (typeof valueStr === "string") {
              // Remove currency symbols and spaces
              let cleanValue = valueStr.replace(/[€$£¥]/g, "").trim();
              
              // Handle German format (1.234,56) vs English format (1,234.56)
              if (cleanValue.includes(",") && cleanValue.includes(".")) {
                // If both separators exist, determine format
                const lastComma = cleanValue.lastIndexOf(",");
                const lastDot = cleanValue.lastIndexOf(".");
                
                if (lastComma > lastDot) {
                  // German format: dot for thousands, comma for decimal
                  cleanValue = cleanValue.replace(/\./g, "").replace(",", ".");
                } else {
                  // English format: comma for thousands, dot for decimal
                  cleanValue = cleanValue.replace(/,/g, "");
                }
              } else if (cleanValue.includes(",")) {
                // Only comma - could be German decimal or English thousands
                // If there are 3 digits after comma, it's likely thousands separator
                const parts = cleanValue.split(",");
                if (parts[parts.length - 1].length === 3) {
                  cleanValue = cleanValue.replace(/,/g, "");
                } else {
                  cleanValue = cleanValue.replace(",", ".");
                }
              }
              
              value = parseFloat(cleanValue) || 0;
            } else if (typeof valueStr === "number") {
              value = valueStr;
            }

            if (name && value > 0) {
              positions.push({
                name: name.trim(),
                isin: isin ? isin.trim() : undefined,
                value
              });
              totalValue += value;
            }
          }

          if (positions.length === 0) {
            throw new Error("Keine gültigen Positionen in der CSV-Datei gefunden");
          }

          resolve({
            positions,
            totalValue
          });
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(new Error(`CSV-Parse-Fehler: ${error.message}`));
      }
    });
  });
}