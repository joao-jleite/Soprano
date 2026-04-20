import { Card, CardContent } from '@/components/ui/card';

export default function LixeiraLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-32 shimmer rounded" />
        <div className="h-4 w-72 shimmer rounded" />
      </div>

      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 w-28 shimmer rounded-md" />
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="p-4 flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 shimmer rounded" />
                  <div className="h-3 w-1/3 shimmer rounded" />
                </div>
                <div className="h-8 w-20 shimmer rounded-md" />
                <div className="h-8 w-20 shimmer rounded-md" />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
