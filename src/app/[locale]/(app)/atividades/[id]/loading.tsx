import { Card, CardContent } from '@/components/ui/card';

export default function ActivityDetailLoading() {
  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-3">
        <div className="h-4 w-24 shimmer rounded" />
        <div className="h-9 w-3/4 shimmer rounded" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2">
              <div className="h-3 w-20 shimmer rounded" />
              <div className="h-4 w-full shimmer rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="h-4 w-1/3 shimmer rounded" />
          <div className="h-32 shimmer rounded" />
        </CardContent>
      </Card>
    </div>
  );
}
