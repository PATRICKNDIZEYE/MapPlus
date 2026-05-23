import { Suspense } from 'react';
import { BuildingMapView } from '@/components/map/BuildingMapView';

interface BuildingPageProps {
  params: { buildingSlug: string };
  searchParams: { floor?: string; from?: string };
}

export default function BuildingPage({ params, searchParams }: BuildingPageProps) {
  return (
    <div className="h-full relative">
      <Suspense
        fallback={
          <div className="h-full flex items-center justify-center bg-gray-100">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Loading map...</p>
            </div>
          </div>
        }
      >
        <BuildingMapView
          buildingSlug={params.buildingSlug}
          initialFloorId={searchParams.floor}
          fromAnchorId={searchParams.from}
        />
      </Suspense>
    </div>
  );
}
