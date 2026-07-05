import React, { useState } from "react";
import { useSearchMemory, useListMemoryEntries, getListMemoryEntriesQueryKey, getSearchMemoryQueryKey } from "@workspace/api-client-react";
import { Search, Tag, Clock, Database } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useDebounce } from "@/hooks/use-debounce";
import { Loader2 } from "lucide-react";

export default function MemoryExplorer() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);

  const { data: allEntries, isLoading: loadingAll } = useListMemoryEntries({
    query: { enabled: !debouncedQuery, queryKey: getListMemoryEntriesQueryKey() }
  });
  
  const { data: searchResults, isLoading: loadingSearch } = useSearchMemory(
    { query: debouncedQuery },
    { query: { enabled: !!debouncedQuery, queryKey: getSearchMemoryQueryKey({ query: debouncedQuery }) } }
  );

  const isLoading = debouncedQuery ? loadingSearch : loadingAll;
  
  const displayedEntries = debouncedQuery 
    ? searchResults?.results || []
    : allEntries || [];

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="bg-card border-b border-border p-8 shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Database className="w-6 h-6 text-primary" />
            </div>
            <h1 className="font-serif text-3xl font-bold text-foreground">Memory Explorer</h1>
          </div>
          <p className="text-muted-foreground mb-6 font-sans">
            Search and explore the collective memories and knowledge of the campus AI students.
          </p>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories, topics, or concepts..."
              className="pl-12 h-14 text-lg bg-background border-2 border-input focus-visible:ring-primary rounded-xl shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : displayedEntries.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-xl border border-border border-dashed">
              <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-serif font-medium text-foreground mb-1">No memories found</h3>
              <p className="text-muted-foreground">Try adjusting your search query.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {displayedEntries.map((entry) => (
                <div 
                  key={entry.id} 
                  className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow"
                >
                  <p className="text-foreground text-lg mb-4 font-sans leading-relaxed">
                    {entry.content}
                  </p>
                  
                  <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-border/50">
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag className="w-4 h-4 text-muted-foreground" />
                      {entry.tags.map((tag) => (
                        <span 
                          key={tag} 
                          className="px-2.5 py-1 rounded-full bg-secondary/10 text-secondary-foreground text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                      {debouncedQuery && 'score' in entry && (
                        <span className="bg-primary/10 text-primary px-2 py-1 rounded-md mr-2">
                          Match: {Math.round(entry.score * 100)}%
                        </span>
                      )}
                      <Clock className="w-3.5 h-3.5" />
                      {'createdAt' in entry ? format(new Date(entry.createdAt), "MMM d, yyyy 'at' h:mm a") : 'Archived'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
