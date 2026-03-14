import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Download } from 'lucide-react';

export interface PipelineUploadSummary {
  datasetName: string;
  fileType: string;
  rowCount: number;
  columnCount: number;
}

export interface PipelineFeatureSummary {
  name: string;
  logic: string;
  description?: string;
}

export interface PipelineVisualizationSummary {
  chartType: string;
  measures: string[];
  dimensions: string[];
  aggregation: string;
  filters: string;
  analytics: string[];
}

export interface PipelineDailyReport {
  date: string;
  upload: PipelineUploadSummary;
  preprocessingSummary: string[];
  featureEngineeringSummary: PipelineFeatureSummary[];
  visualizationSummary: PipelineVisualizationSummary[];
  insightsSummary: string[];
}

interface ReportFormattingProps {
  report: PipelineDailyReport;
  onExportPdf: () => void;
}

export function buildDailyPipelineReportText(report: PipelineDailyReport): string {
  const lines: string[] = [];
  lines.push(`Daily Pipeline Summary Report - ${report.date}`);
  lines.push('');
  lines.push('1) Data Upload Summary');
  lines.push(`Dataset Name: ${report.upload.datasetName}`);
  lines.push(`File Type: ${report.upload.fileType}`);
  lines.push(`Rows: ${report.upload.rowCount}`);
  lines.push(`Columns: ${report.upload.columnCount}`);
  lines.push('');
  lines.push('2) Preprocessing Summary');
  if (report.preprocessingSummary.length === 0) {
    lines.push('No preprocessing steps recorded.');
  } else {
    report.preprocessingSummary.forEach((s) => lines.push(`- ${s}`));
  }
  lines.push('');
  lines.push('3) Feature Engineering Summary');
  if (report.featureEngineeringSummary.length === 0) {
    lines.push('No feature engineering actions recorded.');
  } else {
    report.featureEngineeringSummary.forEach((f) => {
      lines.push(`Feature: ${f.name}`);
      lines.push(`Logic: ${f.logic}`);
      if (f.description) lines.push(`Description: ${f.description}`);
      lines.push('');
    });
  }
  lines.push('4) Visualization Summary');
  if (report.visualizationSummary.length === 0) {
    lines.push('No saved visualizations.');
  } else {
    report.visualizationSummary.forEach((v, idx) => {
      lines.push(`Visualization ${idx + 1}:`);
      lines.push(`  Chart Type: ${v.chartType}`);
      lines.push(`  Measures: ${v.measures.join(', ') || 'N/A'}`);
      lines.push(`  Dimensions: ${v.dimensions.join(', ') || 'N/A'}`);
      lines.push(`  Aggregation: ${v.aggregation}`);
      lines.push(`  Filters: ${v.filters}`);
      lines.push(`  Analytics: ${v.analytics.join(', ') || 'None'}`);
    });
  }
  lines.push('');
  lines.push('5) Insights Summary');
  if (report.insightsSummary.length === 0) {
    lines.push('No insights generated yet.');
  } else {
    report.insightsSummary.forEach((i) => lines.push(`- ${i}`));
  }
  return lines.join('\n');
}

export function ReportFormatting({ report, onExportPdf }: ReportFormattingProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={onExportPdf}>
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Pipeline Summary Report</CardTitle>
          <p className="text-gray-500">{report.date}</p>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader><CardTitle>Data Upload Summary</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>Dataset Name: {report.upload.datasetName}</p>
          <p>File Type: {report.upload.fileType}</p>
          <p>Rows: {report.upload.rowCount}</p>
          <p>Columns: {report.upload.columnCount}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Preprocessing Summary</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          {report.preprocessingSummary.length === 0 ? (
            <p>No preprocessing steps recorded.</p>
          ) : report.preprocessingSummary.map((s, idx) => <p key={idx}>- {s}</p>)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Feature Engineering Summary</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-3">
          {report.featureEngineeringSummary.length === 0 ? (
            <p>No feature engineering actions recorded.</p>
          ) : report.featureEngineeringSummary.map((f, idx) => (
            <div key={`${f.name}-${idx}`} className="border rounded p-2 bg-gray-50">
              <p>Feature: {f.name}</p>
              <p>Logic: {f.logic}</p>
              {f.description && <p>Description: {f.description}</p>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Visualization Summary</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          {report.visualizationSummary.length === 0 ? (
            <p>No saved visualizations.</p>
          ) : report.visualizationSummary.map((v, idx) => (
            <div key={`${v.chartType}-${idx}`} className="border rounded p-2">
              <p>Chart Type: {v.chartType}</p>
              <p>Measures: {v.measures.join(', ') || 'N/A'}</p>
              <p>Dimensions: {v.dimensions.join(', ') || 'N/A'}</p>
              <p>Aggregation: {v.aggregation}</p>
              <p>Filters: {v.filters}</p>
              <p>Analytics: {v.analytics.join(', ') || 'None'}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Insights Summary</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          {report.insightsSummary.length === 0 ? (
            <p>No insights generated yet.</p>
          ) : report.insightsSummary.map((i, idx) => <p key={idx}>- {i}</p>)}
        </CardContent>
      </Card>
    </div>
  );
}
