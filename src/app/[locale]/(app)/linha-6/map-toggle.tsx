'use client';

import { useState } from 'react';
import { Map, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Linha6Map } from '@/components/map/linha-6-map';

type Stop = { id: string; name: string; kind: string; sort_order: number };

export function MapToggle({ stops, locale }: { stops: Stop[]; locale: string }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(v => !v)}
          className="gap-1.5 text-muted-foreground hover:text-foreground px-2 -ml-2"
        >
          {open ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Ocultar mapa
            </>
          ) : (
            <>
              <Map className="h-3.5 w-3.5" />
              Mostrar mapa
            </>
          )}
        </Button>
      </div>

      {open && <Linha6Map stops={stops} locale={locale} />}
    </div>
  );
}
