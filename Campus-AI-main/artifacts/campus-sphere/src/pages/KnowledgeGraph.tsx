import React, { useEffect, useRef, useState } from "react";
import { useGetKnowledgeGraph, GraphNode, GraphEdge } from "@workspace/api-client-react";
import * as d3 from "d3";
import { Network, Loader2, Info } from "lucide-react";

export default function KnowledgeGraph() {
  const { data: graphData, isLoading } = useGetKnowledgeGraph();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    if (!graphData || !svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    // Add zoom capabilities
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    const g = svg.append("g");

    // Copy data for d3 simulation so we don't mutate the original React state directly
    const nodes = graphData.nodes.map(d => ({ ...d }));
    const links = graphData.edges.map(d => ({ ...d, source: d.source, target: d.target }));

    // Define colors based on node type
    const colorScale = d3.scaleOrdinal()
      .domain(["Student", "Concept", "Memory", "Location"])
      .range(["#22c55e", "#f59e0b", "#3b82f6", "#a855f7"]);

    // Simulation
    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(50));

    // Draw links
    const link = g.append("g")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 2);

    // Link labels
    const linkLabel = g.append("g")
      .selectAll("text")
      .data(links)
      .join("text")
      .attr("font-size", 10)
      .attr("fill", "#64748b")
      .attr("text-anchor", "middle")
      .text((d: any) => d.label);

    // Draw nodes
    const node = g.append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => d.type === "Student" ? 24 : 16)
      .attr("fill", (d: any) => colorScale(d.type) as string)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
      )
      .on("click", (event, d) => {
        event.stopPropagation();
        setSelectedNode(d as GraphNode);
      });

    // Node labels
    const label = g.append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .attr("font-size", 12)
      .attr("fill", "hsl(var(--foreground))")
      .attr("font-family", "var(--app-font-sans)")
      .attr("dx", 0)
      .attr("dy", (d) => (d.type === "Student" ? 35 : 25))
      .attr("text-anchor", "middle")
      .text((d) => d.label)
      .style("pointer-events", "none");

    // Click on background to clear selection
    svg.on("click", () => {
      setSelectedNode(null);
    });

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      linkLabel
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2 - 5);

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);

      label
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [graphData]);

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      <div className="absolute top-8 left-8 z-10 bg-card/80 backdrop-blur-md p-6 rounded-xl border border-border shadow-lg max-w-sm pointer-events-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Network className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Knowledge Graph</h1>
        </div>
        <p className="text-muted-foreground text-sm font-sans mb-4">
          Visualize the connections between students, concepts, memories, and locations across the campus.
        </p>
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <span className="flex items-center gap-1.5 bg-green-500/10 text-green-700 px-2 py-1 rounded-md">
            <span className="w-2 h-2 rounded-full bg-green-500"></span> Student
          </span>
          <span className="flex items-center gap-1.5 bg-amber-500/10 text-amber-700 px-2 py-1 rounded-md">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> Concept
          </span>
          <span className="flex items-center gap-1.5 bg-blue-500/10 text-blue-700 px-2 py-1 rounded-md">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span> Memory
          </span>
          <span className="flex items-center gap-1.5 bg-purple-500/10 text-purple-700 px-2 py-1 rounded-md">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span> Location
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : (
        <div ref={containerRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing">
          <svg ref={svgRef} className="w-full h-full" />
        </div>
      )}

      {/* Node Details Panel */}
      {selectedNode && (
        <div className="absolute top-8 right-8 z-10 w-80 bg-card border border-border shadow-2xl rounded-xl overflow-hidden animate-in slide-in-from-right-8 fade-in">
          <div className="p-4 bg-muted/30 border-b border-border flex items-start gap-3">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-serif font-bold text-lg leading-tight">{selectedNode.label}</h3>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{selectedNode.type}</p>
            </div>
          </div>
          <div className="p-4 font-sans text-sm">
            {selectedNode.metadata ? (
              <div className="space-y-2">
                {Object.entries(selectedNode.metadata).map(([key, value]) => (
                  <div key={key}>
                    <span className="font-medium text-foreground capitalize">{key.replace(/_/g, ' ')}: </span>
                    <span className="text-muted-foreground">{String(value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground italic">No additional metadata available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
