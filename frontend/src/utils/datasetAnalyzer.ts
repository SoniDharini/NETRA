export type ProblemType = 'classification' | 'regression';
export type DatasetSize = 'small' | 'medium' | 'large';
export type TargetType = 'categorical' | 'numerical';

export interface DatasetAnalysis {
  targetType: TargetType;
  problemType: ProblemType;
  featureCount: number;
  rowCount: number;
  missingValueCount: number;
  missingValueRatio: number;
  datasetSize: DatasetSize;
  invalidNumericLikeColumns: string[];
}

const sanitizeNumericString = (value: string): string => {
  // Keep minus sign and decimal point, remove commas/currency-like symbols.
  return value.replace(/,/g, '').replace(/[^\d.-]/g, '');
};

const toNumericIfPossible = (value: unknown): number | null => {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const sanitized = sanitizeNumericString(trimmed);
  if (!sanitized || sanitized === '-' || sanitized === '.' || sanitized === '-.') return null;
  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : null;
};

const inferDatasetSize = (rowCount: number): DatasetSize => {
  if (rowCount < 1_000) return 'small';
  if (rowCount < 10_000) return 'medium';
  return 'large';
};

export function analyzeDataset(rows: any[], columns: string[], targetColumn: string): DatasetAnalysis {
  const safeRows = Array.isArray(rows) ? rows : [];
  const rowCount = safeRows.length;
  const featureCount = Math.max(0, (columns || []).filter((c) => c !== targetColumn).length);

  let missingValueCount = 0;
  const invalidNumericLikeColumns = new Set<string>();

  (columns || []).forEach((col) => {
    for (const row of safeRows) {
      const value = row?.[col];
      if (value == null || value === '') {
        missingValueCount += 1;
        continue;
      }
      if (typeof value === 'string') {
        const raw = value.trim();
        if (!raw) {
          missingValueCount += 1;
          continue;
        }
        // Numeric-looking values containing comma separators can break backend numeric conversion.
        const looksNumericWithComma = /-?\d{1,3}(,\d{3})+(\.\d+)?/.test(raw);
        if (looksNumericWithComma) {
          invalidNumericLikeColumns.add(col);
        }
      }
    }
  });

  const targetValues = safeRows
    .map((row) => row?.[targetColumn])
    .filter((value) => value != null && value !== '');

  const numericTargetCount = targetValues.reduce((acc, value) => (toNumericIfPossible(value) != null ? acc + 1 : acc), 0);
  const numericRatio = targetValues.length > 0 ? numericTargetCount / targetValues.length : 0;

  const uniqueTargetValues = new Set(targetValues.map((v) => String(v))).size;
  const targetType: TargetType = numericRatio >= 0.9 ? 'numerical' : 'categorical';

  const problemType: ProblemType =
    targetType === 'categorical' || (targetType === 'numerical' && uniqueTargetValues <= 20)
      ? 'classification'
      : 'regression';

  const totalCells = Math.max(1, rowCount * Math.max(1, columns?.length || 1));
  return {
    targetType,
    problemType,
    featureCount,
    rowCount,
    missingValueCount,
    missingValueRatio: missingValueCount / totalCells,
    datasetSize: inferDatasetSize(rowCount),
    invalidNumericLikeColumns: Array.from(invalidNumericLikeColumns),
  };
}

