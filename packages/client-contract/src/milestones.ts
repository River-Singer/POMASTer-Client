/**
 * M1+ sketch DTOs (PRD §43): declared now per DECISION.DSH05 (full M1-M7
 * graph), filled by later milestones. Kept minimal on purpose — spike scope
 * is PR-1 only (DECISION.DSH03); these types exist so the contract surface
 * is visible before M1 lands.
 */

/** Task list entry (PRD §9). Spike fills counts only; M2 fills pages. */
export interface TaskSummary {
  id: string
  lifecycle: string
  title?: string
}

export interface TasksOverview {
  schema: 'pomaster.workbench.tasks/v1-spike'
  activeCount: number
  items: TaskSummary[]
}

/** Knowledge item metadata (PRD §12). M3 fills routing explainability. */
export interface KnowledgeItemMeta {
  id: string
  type: string
  source?: string
  freshness?: string
  applicability?: string[]
}

export interface KnowledgeList {
  schema: 'pomaster.workbench.knowledge/v1-spike'
  items: KnowledgeItemMeta[]
}

/** Topology node/edge (PRD §15-16). Unproven edges stay Observed Candidate. */
export interface TopologyNode {
  id: string
  kind: 'Page' | 'Component' | 'Route' | 'API' | 'Service' | 'Repository' | 'Table' | 'Spec' | 'Task'
}

export interface TopologyEdge {
  from: string
  to: string
  relation: string
  /** Declared | Observed | Derived — Observed/Derived must not upgrade to Truth (PRD §16). */
  source: 'Declared' | 'Observed' | 'Derived'
}

export interface TopologyGraph {
  schema: 'pomaster.workbench.topology/v1-spike'
  nodes: TopologyNode[]
  edges: TopologyEdge[]
}
