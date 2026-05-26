import { SopranoMark } from '@/components/brand/logo';

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <SopranoMark className="h-10 w-10 animate-pulse" />
        <p className="text-data">Carregando</p>
      </div>
    </div>
  );
}
