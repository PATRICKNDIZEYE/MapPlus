import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { navNodes, navEdges, qrAnchors } from '@mallguide/shared';
import type { Route, RouteStep } from '@mallguide/shared';

interface GraphNode {
  id: string;
  floorId: string;
  floorNumber: number;
  type: string;
  coordinates: [number, number];
  accessible: boolean;
}

interface GraphEdge {
  fromId: string;
  toId: string;
  distanceM: number;
  accessible: boolean;
  isActive: boolean;
}

@Injectable()
export class RoutingService {
  constructor(private db: DatabaseService) {}

  async resolveQrAnchor(shortCode: string) {
    const [anchor] = await this.db.db
      .select()
      .from(qrAnchors)
      .where(eq(qrAnchors.shortCode, shortCode))
      .limit(1);

    if (!anchor) throw new NotFoundException(`QR code "${shortCode}" not found`);
    return anchor;
  }

  async findRoute(
    buildingId: string,
    fromNodeId: string,
    toNodeId: string,
    accessibleOnly = false,
  ): Promise<Route> {
    // Load all active nodes and edges for this building
    const allNodes = await this.db.rawPool.query<{
      id: string;
      floor_id: string;
      floor_number: number;
      type: string;
      lng: number;
      lat: number;
      accessible: boolean;
    }>(
      `SELECT n.id, n.floor_id, f.floor_number, n.type, n.accessible,
              ST_X(n.geometry) as lng, ST_Y(n.geometry) as lat
       FROM nav_nodes n
       JOIN floors f ON f.id = n.floor_id
       WHERE n.building_id = $1 AND n.is_active = true`,
      [buildingId],
    );

    const allEdges = await this.db.db
      .select()
      .from(navEdges)
      .where(eq(navEdges.isActive, true));

    const nodeMap = new Map<string, GraphNode>();
    for (const row of allNodes.rows) {
      nodeMap.set(row.id, {
        id: row.id,
        floorId: row.floor_id,
        floorNumber: row.floor_number,
        type: row.type,
        coordinates: [row.lng, row.lat],
        accessible: row.accessible,
      });
    }

    const path = dijkstra(nodeMap, allEdges, fromNodeId, toNodeId, accessibleOnly);
    if (!path) throw new BadRequestException('No route found between these points');

    const steps: RouteStep[] = path.map((nodeId) => {
      const node = nodeMap.get(nodeId)!;
      return {
        nodeId: node.id,
        floorId: node.floorId,
        floorNumber: node.floorNumber,
        type: node.type,
        coordinates: node.coordinates,
      };
    });

    // Annotate floor changes
    const floorChanges: Route['floorChanges'] = [];
    for (let i = 1; i < steps.length; i++) {
      const prev = steps[i - 1]!;
      const curr = steps[i]!;
      if (prev.floorNumber !== curr.floorNumber) {
        const edge = allEdges.find(
          (e) =>
            (e.fromNodeId === prev.nodeId && e.toNodeId === curr.nodeId) ||
            (e.bidirectional && e.toNodeId === prev.nodeId && e.fromNodeId === curr.nodeId),
        );
        floorChanges.push({
          atNodeId: prev.nodeId,
          type: edge?.floorChange ?? 'stairs',
          toFloorNumber: curr.floorNumber,
        });
      }
    }

    const totalDistanceM = calculatePathDistance(path, nodeMap, allEdges);
    return { totalDistanceM, steps, floorChanges };
  }
}

// Dijkstra — adequate for single-building graphs (< 2000 nodes)
function dijkstra(
  nodes: Map<string, GraphNode>,
  edges: Array<{ fromNodeId: string; toNodeId: string; distanceM: string | number; bidirectional: boolean; accessible: boolean; isActive: boolean }>,
  startId: string,
  endId: string,
  accessibleOnly: boolean,
): string[] | null {
  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const unvisited = new Set<string>(nodes.keys());

  for (const id of nodes.keys()) dist.set(id, Infinity);
  dist.set(startId, 0);

  while (unvisited.size > 0) {
    // Find unvisited node with smallest distance
    let u: string | null = null;
    for (const id of unvisited) {
      if (u === null || (dist.get(id) ?? Infinity) < (dist.get(u) ?? Infinity)) u = id;
    }

    if (!u || dist.get(u) === Infinity) break;
    if (u === endId) break;

    unvisited.delete(u);

    // Process neighbours
    for (const edge of edges) {
      if (!edge.isActive) continue;
      if (accessibleOnly && !edge.accessible) continue;

      let neighbor: string | null = null;
      if (edge.fromNodeId === u) neighbor = edge.toNodeId;
      else if (edge.bidirectional && edge.toNodeId === u) neighbor = edge.fromNodeId;

      if (!neighbor || !unvisited.has(neighbor)) continue;

      const node = nodes.get(neighbor);
      if (accessibleOnly && node && !node.accessible) continue;

      const alt = (dist.get(u) ?? Infinity) + Number(edge.distanceM);
      if (alt < (dist.get(neighbor) ?? Infinity)) {
        dist.set(neighbor, alt);
        prev.set(neighbor, u);
      }
    }
  }

  if (dist.get(endId) === Infinity) return null;

  // Reconstruct path
  const path: string[] = [];
  let current: string | undefined = endId;
  while (current) {
    path.unshift(current);
    current = prev.get(current);
  }
  return path;
}

function calculatePathDistance(
  path: string[],
  nodes: Map<string, GraphNode>,
  edges: Array<{ fromNodeId: string; toNodeId: string; distanceM: string | number; bidirectional: boolean }>,
): number {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i]!;
    const to = path[i + 1]!;
    const edge = edges.find(
      (e) =>
        (e.fromNodeId === from && e.toNodeId === to) ||
        (e.bidirectional && e.toNodeId === from && e.fromNodeId === to),
    );
    total += Number(edge?.distanceM ?? 0);
  }
  return Math.round(total * 10) / 10;
}
