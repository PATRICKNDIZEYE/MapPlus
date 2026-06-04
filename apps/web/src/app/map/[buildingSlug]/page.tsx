import { Suspense } from 'react';
import { BuildingMapView } from '@/components/map/BuildingMapView';
import { BrandedLoader } from '@/components/ui/BrandedLoader';

interface BuildingPageProps {
  params: { buildingSlug: string };
  searchParams: { floor?: string; from?: string };
}

export default function BuildingPage({ params, searchParams }: BuildingPageProps) {
  return (
    <div className="h-full relative">
      <Suspense
        fallback={
          <div className="h-full flex items-center justify-center bg-slate-50">
            <BrandedLoader size="lg" label="Loading map…" />
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
