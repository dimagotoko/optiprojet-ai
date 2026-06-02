import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function DashboardSkeleton() {
  return (
    <div className="container py-12 px-4 md:px-6">
      <div className="grid gap-8 md:grid-cols-3">
        {/* Profile card */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="flex flex-col items-center text-center gap-3">
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 pb-6">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full rounded-md" />
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="md:col-span-2 space-y-6">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-10 w-full rounded-md" />
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-52" />
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Skeleton className="h-8 w-20 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
