"use client";
import "@xyflow/react/dist/style.css";
import { ReactFlow, Background, Controls, type Node, type Edge } from "@xyflow/react";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import dagre from "dagre";

import { useVaultEntities } from "@/hooks/vaults/useVaultEntities";
import { useVaultEntity } from "@/hooks/vaults/useVaultEntity";
import { useVaultEntityNeighbors } from "@/hooks/vaults/useVaultEntityNeighbors";
import { useVaultStats } from "@/hooks/vaults/useVaultStats";

function layout(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 50, ranksep: 80 });
  nodes.forEach((n) => g.setNode(n.id, { width: 160, height: 40 }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return {
    nodes: nodes.map((n) => {
      const p = g.node(n.id) as { x: number; y: number };
      return { ...n, position: { x: p.x - 80, y: p.y - 20 } };
    }),
    edges,
  };
}

export function VaultGraphView({ vaultId }: { vaultId: string }) {
  const t = useTranslations("vault.kg");
  const { data: stats } = useVaultStats(vaultId);
  const [search, setSearch] = useState("");
  const { data: entities } = useVaultEntities(vaultId, { search, limit: 50 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: entity } = useVaultEntity(vaultId, selectedId ?? undefined);
  const { data: neighbors } = useVaultEntityNeighbors(vaultId, selectedId ?? undefined, 1);

  const { nodes, edges } = useMemo(() => {
    if (!neighbors) return { nodes: [] as Node[], edges: [] as Edge[] };
    const ns: Node[] = neighbors.nodes.map((n) => ({
      id: n.id,
      data: { label: n.label ?? n.id },
      position: { x: 0, y: 0 },
    }));
    const es: Edge[] = neighbors.edges
      .filter((e) => e.source && e.target)
      .map((e, i) => ({
        id: `e${i}`, source: e.source!, target: e.target!,
        label: e.type, type: "default",
      }));
    return layout(ns, es);
  }, [neighbors]);

  return (
    <div className="grid grid-cols-[280px_1fr] h-full">
      <aside className="border-r p-3 overflow-y-auto">
        <input
          className="w-full border rounded px-2 py-1 text-sm mb-2"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="text-xs opacity-60 mb-2">
          {stats ? `${stats.entities} entities · ${stats.relations} relations` : "—"}
        </div>
        {!entities || entities.items.length === 0 ? (
          <div className="text-sm opacity-50">{t("empty")}</div>
        ) : (
          <ul className="space-y-1">
            {entities.items.map((e) => (
              <li key={e.id}>
                <button
                  className={`w-full text-left px-2 py-1 rounded ${selectedId === e.id ? "bg-muted" : ""}`}
                  onClick={() => setSelectedId(e.id)}
                >
                  <div className="text-sm">{e.entity_name ?? e.id}</div>
                  <div className="text-xs opacity-60">{e.entity_type}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
      <main className="relative">
        {entity && (
          <div className="absolute top-2 left-2 z-10 bg-background/90 p-3 border rounded text-sm max-w-sm">
            <div className="font-medium">{entity.entity_name ?? entity.id}</div>
            <div className="text-xs opacity-60">{entity.entity_type}</div>
            {entity.content && <div className="mt-1 line-clamp-3">{entity.content}</div>}
          </div>
        )}
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </main>
    </div>
  );
}
