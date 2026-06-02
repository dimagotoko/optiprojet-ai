import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

export function TripCardSkeleton() {
  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <CardHeader className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-3 rounded-full shrink-0" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-6 w-14 rounded-full shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4 pt-0 space-y-4">
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-4 w-32" />
      </CardContent>
      <CardFooter className="p-4 border-t flex justify-end">
        <Skeleton className="h-8 w-24 rounded-md" />
      </CardFooter>
    </Card>
  );
}

export function TripGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <TripCardSkeleton key={i} />
      ))}
    </div>
  );
}
