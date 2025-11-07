'use client';

import { useState } from 'react';

import { Button } from '@/src/components/ui/button';

export function DownloadReportButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/reports/recent/export');
      if (!response.ok) {
        throw new Error('Failed to export report');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'load-test-report.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.warn('Failed to export report', error);
      alert('Unable to export report. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleDownload} disabled={isLoading} variant="secondary">
      {isLoading ? 'Preparing PDF…' : 'Download PDF Report'}
    </Button>
  );
}
