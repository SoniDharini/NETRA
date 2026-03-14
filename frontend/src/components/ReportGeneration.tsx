import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { apiService } from '../services/api.service';
import { ReportFormatting, PipelineDailyReport, buildDailyPipelineReportText } from './reportFormatting';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner';

export function ReportGeneration({ projectData }: { projectData: any }) {
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<PipelineDailyReport | null>(null);

  useEffect(() => {
    const buildReport = async () => {
      const fileId = projectData?.fileId;
      if (!fileId) return;

      setIsLoading(true);
      try {
        const [previewRes, profileRes, vizRes] = await Promise.all([
          apiService.getDataPreview(String(fileId), 10),
          apiService.getDatasetProfileFull(String(fileId)),
          apiService.getSavedVisualizations(String(fileId)),
        ]);

        const previewData: any = previewRes.success ? previewRes.data : null;
        const profileData: any = profileRes.success ? profileRes.data : null;
        const savedViz: any[] = vizRes.success && Array.isArray(vizRes.data) ? vizRes.data : [];

        const uploadSummary = {
          datasetName: projectData?.fileName || `Dataset-${fileId}`,
          fileType: (projectData?.fileName?.split('.').pop() || 'csv').toUpperCase(),
          rowCount: previewData?.rowCount || previewData?.data?.rowCount || 0,
          columnCount: (previewData?.columns || previewData?.data?.columns || []).length,
        };

        const preprocessingSummary = Array.isArray(projectData?.preprocessingSteps)
          ? projectData.preprocessingSteps
          : [];

        const featureEngineeringSummary = (profileData?.feature_engineering || []).map((f: any) => ({
          name: f.name || f.newFeatures?.[0] || f.type || 'EngineeredFeature',
          logic: f.logic || 'Derived from selected columns',
          description: f.description || '',
        }));

        const visualizationSummary = savedViz.map((v: any) => ({
          chartType: v.chart_type || v?.config?.__meta?.chartType || 'bar',
          measures: (v?.config?.rows || []).map((r: any) => r.name || String(r)),
          dimensions: (v?.config?.columns || []).map((c: any) => c.name || String(c)),
          aggregation: v?.config?.__meta?.analyticsConfig?.aggregation || 'sum',
          filters: v?.config?.__meta?.filterConfig?.mode || 'none',
          analytics: Object.entries(v?.config?.__meta?.analyticsConfig || {})
            .filter(([_, enabled]) => enabled === true)
            .map(([k]) => k),
        }));

        const insightsSummary: string[] = [];
        if (visualizationSummary.length > 0) {
          const first = visualizationSummary[0];
          insightsSummary.push(
            `Primary visualization uses ${first.chartType} chart with ${first.measures.join(', ') || 'selected measures'}.`
          );
        }
        if (featureEngineeringSummary.length > 0) {
          insightsSummary.push(
            `Feature engineering added ${featureEngineeringSummary.length} candidate feature(s), including ${featureEngineeringSummary[0].name}.`
          );
        }
        if (preprocessingSummary.length > 0) {
          insightsSummary.push(`Preprocessing completed with ${preprocessingSummary.length} selected step(s).`);
        }

        setReport({
          date: new Date().toLocaleDateString(),
          upload: uploadSummary,
          preprocessingSummary,
          featureEngineeringSummary,
          visualizationSummary,
          insightsSummary,
        });
      } catch (err) {
        toast.error('Failed to build report data');
      } finally {
        setIsLoading(false);
      }
    };

    buildReport();
  }, [projectData?.fileId, projectData?.fileName, projectData?.preprocessingSteps]);

  const handleExportPdf = async () => {
    if (!report) return;
    try {
      const text = buildDailyPipelineReportText(report);
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(text, 550);
      let y = 40;
      lines.forEach((line: string) => {
        if (y > 800) {
          doc.addPage();
          y = 40;
        }
        doc.text(line, 30, y);
        y += 16;
      });
      doc.save(`daily-pipeline-report-${Date.now()}.pdf`);
      toast.success('Report exported as PDF');
    } catch (e) {
      toast.error('Failed to export report PDF');
    }
  };

  if (!projectData?.fileId) {
    return (
      <Alert>
        <AlertDescription>
          Please complete upload and preprocessing before generating a report.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <Alert>
        <AlertDescription>No report data available.</AlertDescription>
      </Alert>
    );
  }

  return <ReportFormatting report={report} onExportPdf={handleExportPdf} />;
}
