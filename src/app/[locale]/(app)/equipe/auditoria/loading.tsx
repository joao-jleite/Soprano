import { Card, CardContent } from '@/components/ui/card';

export default function AuditoriaLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-40 shimmer rounded" />
        <div className="h-4 w-64 shimmer rounded" />
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <div className="h-9 w-40 shimmer rounded-md" />
          <div className="h-9 w-40 shimmer rounded-md" />
          <div className="h-9 w-56 shimmer rounded-md" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <li key={i} className="p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-20 shimmer rounded-full" />
                  <div className="h-4 w-48 shimmer rounded" />
                </div>
                <div className="h-3 w-full shimmer rounded" />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
