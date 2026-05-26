import { Card, CardContent } from '@/components/ui/card';

export default function ActivitiesLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-4 w-32 shimmer rounded" />
        <div className="h-8 w-64 shimmer rounded" />
      </div>

      <div className="h-14 shimmer rounded-lg" />

      <ul className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i}>
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="h-3 w-20 shimmer rounded" />
                <div className="h-4 w-3/4 shimmer rounded" />
                <div className="h-3 w-1/2 shimmer rounded" />
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
