import { Card, CardContent } from '@/components/ui/card';

export default function LocaisLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-40 shimmer rounded" />
        <div className="h-4 w-72 shimmer rounded" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2">
              <div className="h-3 w-16 shimmer rounded" />
              <div className="h-5 w-3/4 shimmer rounded" />
              <div className="h-3 w-1/2 shimmer rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
