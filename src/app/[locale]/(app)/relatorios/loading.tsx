import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function RelatoriosLoading() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div className="space-y-2">
        <div className="h-8 w-48 shimmer rounded" />
        <div className="h-4 w-64 shimmer rounded" />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5 space-y-3">
              <div className="h-3 w-20 shimmer rounded" />
              <div className="h-8 w-16 shimmer rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 w-40 shimmer rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-36 shimmer rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5 space-y-3">
              <div className="h-4 w-32 shimmer rounded" />
              <div className="h-12 w-24 shimmer rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
