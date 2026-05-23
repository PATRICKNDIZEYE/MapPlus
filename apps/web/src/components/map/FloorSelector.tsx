'use client';

import { useMapActions, useActiveFloorId } from '@/store/map.store';

interface Floor {
  id: string;
  floorNumber: number;
  name: string;
  shortName: string | null;
}

export function FloorSelector({ floors }: { floors: Floor[] }) {
  const { setActiveFloor } = useMapActions();
  const activeFloorId = useActiveFloorId();
  const sorted = [...floors].sort((a, b) => b.floorNumber - a.floorNumber);

  return (
    <div className="flex flex-col gap-1.5 bg-white/90 backdrop-blur-sm rounded-2xl p-1.5 shadow-float border border-white/60">
      {sorted.map((floor) => {
        const label = floor.shortName ?? (floor.floorNumber === 0 ? 'G' : `L${floor.floorNumber}`);
        const active = activeFloorId === floor.id;
        return (
          <button
            key={floor.id}
            onClick={() => setActiveFloor(floor.id, floor.floorNumber)}
            title={floor.name}
            className={`w-10 h-10 rounded-xl text-xs font-bold transition-all
              ${active
                ? 'bg-gray-900 text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
              }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
