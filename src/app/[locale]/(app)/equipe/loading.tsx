import { Card, CardContent } from '@/components/ui/card';

export default function EquipeLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 shimmer rounded" />
          <div className="h-4 w-64 shimmer rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 shimmer rounded-md" />
          <div className="h-9 w-28 shimmer rounded-md" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full shimmer" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 shimmer rounded" />
                  <div className="h-3 w-32 shimmer rounded" />
                </div>
                <div className="h-6 w-20 shimmer rounded-full" />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
