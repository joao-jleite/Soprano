'use client';

import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PdfDownloadButton({ activityId }: { activityId: string }) {
  return (
    <Button asChild variant="secondary" size="sm">
      <a href={`/api/atividades/${activityId}/pdf`} target="_blank" rel="noopener noreferrer">
        <FileDown className="h-4 w-4" />
        PDF
      </a>
    </Button>
  );
}
