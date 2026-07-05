import { logger } from "./logger";

const COGNEE_SERVICE_URL = process.env.COGNEE_SERVICE_URL;
const COGNEE_API_KEY = process.env.COGNEE_API_KEY;

function getCogneeHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${COGNEE_API_KEY}`,
  };
}

function isConfigured(): boolean {
  return !!(COGNEE_SERVICE_URL && COGNEE_API_KEY);
}

export interface CogneeSearchResult {
  id: string;
  content: string;
  score: number;
  tags: string[];
  metadata?: Record<string, unknown>;
}

export interface CogneeGraphNode {
  id: string;
  label: string;
  type: string;
  metadata?: Record<string, unknown>;
}

export interface CogneeGraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface CogneeGraph {
  nodes: CogneeGraphNode[];
  edges: CogneeGraphEdge[];
}

export async function cogneeSearch(
  query: string,
  _studentId?: number
): Promise<CogneeSearchResult[]> {
  if (!isConfigured()) {
    logger.warn("Cognee not configured — returning empty results");
    return [];
  }

  try {
    const res = await fetch(`${COGNEE_SERVICE_URL}/api/v1/search`, {
      method: "POST",
      headers: getCogneeHeaders(),
      body: JSON.stringify({ query, search_type: "INSIGHTS" }),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error({ status: res.status, body: text }, "Cognee search failed");
      return [];
    }

    const data = (await res.json()) as unknown;
    // Normalize Cognee response to our format
    if (Array.isArray(data)) {
      return data.map((item: Record<string, unknown>, i: number) => ({
        id: String((item.id as string | number | undefined) ?? i),
        content: String((item.text as string | undefined) ?? (item.content as string | undefined) ?? ""),
        score: Number((item.score as number | undefined) ?? 1.0),
        tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
        metadata: (item.metadata as Record<string, unknown> | undefined) ?? {},
      }));
    }
    return [];
  } catch (err) {
    logger.error({ err }, "Cognee search error");
    return [];
  }
}

export async function cogneeAdd(content: string, tags: string[] = []): Promise<boolean> {
  if (!isConfigured()) {
    logger.warn("Cognee not configured — skipping add");
    return false;
  }

  try {
    const res = await fetch(`${COGNEE_SERVICE_URL}/api/v1/add`, {
      method: "POST",
      headers: getCogneeHeaders(),
      body: JSON.stringify({ data: content, dataset_name: "campus", tags }),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error({ status: res.status, body: text }, "Cognee add failed");
      return false;
    }

    // Trigger cognify to process the added data
    await fetch(`${COGNEE_SERVICE_URL}/api/v1/cognify`, {
      method: "POST",
      headers: getCogneeHeaders(),
      body: JSON.stringify({ datasets: ["campus"] }),
    });

    return true;
  } catch (err) {
    logger.error({ err }, "Cognee add error");
    return false;
  }
}

export async function cogneeGraph(): Promise<CogneeGraph> {
  if (!isConfigured()) {
    logger.warn("Cognee not configured — returning empty graph");
    return { nodes: [], edges: [] };
  }

  try {
    const res = await fetch(`${COGNEE_SERVICE_URL}/api/v1/visualize`, {
      method: "GET",
      headers: getCogneeHeaders(),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error({ status: res.status, body: text }, "Cognee graph failed");
      return { nodes: [], edges: [] };
    }

    const data = (await res.json()) as Record<string, unknown>;

    const rawNodes = Array.isArray(data.nodes) ? data.nodes : [];
    const rawEdges = Array.isArray(data.edges) ? data.edges : [];

    const nodes: CogneeGraphNode[] = rawNodes.map((n: Record<string, unknown>, i: number) => ({
      id: String((n.id as string | undefined) ?? i),
      label: String((n.label as string | undefined) ?? (n.name as string | undefined) ?? "Node"),
      type: String((n.type as string | undefined) ?? "concept"),
      metadata: (n.metadata as Record<string, unknown> | undefined) ?? {},
    }));

    const edges: CogneeGraphEdge[] = rawEdges.map((e: Record<string, unknown>, i: number) => ({
      id: String((e.id as string | undefined) ?? i),
      source: String((e.source as string | undefined) ?? (e.from as string | undefined) ?? ""),
      target: String((e.target as string | undefined) ?? (e.to as string | undefined) ?? ""),
      label: String((e.label as string | undefined) ?? (e.relation as string | undefined) ?? "relates to"),
    }));

    return { nodes, edges };
  } catch (err) {
    logger.error({ err }, "Cognee graph error");
    return { nodes: [], edges: [] };
  }
}
