import React from "react";
import { useGetMemoryTimeline, TimelineEvent } from "@workspace/api-client-react";
import { format, isSameDay } from "date-fns";
import { History, MessageSquare, Database, UserPlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Timeline() {
  const { data: timelineEvents, isLoading } = useGetMemoryTimeline();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Group events by date
  const groupedEvents: { date: Date; events: TimelineEvent[] }[] = [];
  
  if (timelineEvents) {
    let currentDate: Date | null = null;
    let currentGroup: TimelineEvent[] = [];

    // Assuming events are sorted by timestamp desc
    timelineEvents.forEach((event) => {
      const eventDate = new Date(event.timestamp);
      
      if (!currentDate || !isSameDay(currentDate, eventDate)) {
        if (currentGroup.length > 0 && currentDate) {
          groupedEvents.push({ date: currentDate, events: currentGroup });
        }
        currentDate = eventDate;
        currentGroup = [event];
      } else {
        currentGroup.push(event);
      }
    });

    if (currentGroup.length > 0 && currentDate) {
      groupedEvents.push({ date: currentDate, events: currentGroup });
    }
  }

  const getEventIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'conversation': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'memory': return <Database className="w-4 h-4 text-purple-500" />;
      case 'student_joined': return <UserPlus className="w-4 h-4 text-green-500" />;
      default: return <History className="w-4 h-4 text-gray-500" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'conversation': return "bg-blue-500/10 border-blue-500/20";
      case 'memory': return "bg-purple-500/10 border-purple-500/20";
      case 'student_joined': return "bg-green-500/10 border-green-500/20";
      default: return "bg-gray-500/10 border-gray-500/20";
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4">
            <History className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-serif text-4xl font-bold text-foreground mb-3">Campus Timeline</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            A chronological record of activities, conversations, and emerging knowledge across the campus.
          </p>
        </div>

        {groupedEvents.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-xl border border-border border-dashed">
            <History className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-serif font-medium text-foreground mb-1">No timeline events</h3>
            <p className="text-muted-foreground">Activities will appear here over time.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {groupedEvents.map((group, groupIndex) => (
              <div key={groupIndex} className="relative">
                {/* Date Header */}
                <div className="sticky top-0 z-10 py-2 bg-background/95 backdrop-blur-sm mb-6 flex items-center gap-4">
                  <h2 className="font-sans font-bold text-lg text-foreground bg-secondary/10 text-secondary-foreground px-4 py-1.5 rounded-full">
                    {format(group.date, "MMMM d, yyyy")}
                  </h2>
                  <div className="h-px bg-border flex-1"></div>
                </div>

                {/* Events List */}
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                  {group.events.map((event, index) => (
                    <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      {/* Icon */}
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-card shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        {getEventIcon(event.type)}
                      </div>
                      
                      {/* Card */}
                      <div className={cn(
                        "w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-xl border shadow-sm transition-all hover:shadow-md",
                        getEventColor(event.type)
                      )}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono font-medium text-muted-foreground uppercase">
                            {event.type.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium bg-background px-2 py-0.5 rounded-md shadow-sm">
                            {format(new Date(event.timestamp), "h:mm a")}
                          </span>
                        </div>
                        <h3 className="font-serif font-bold text-lg mb-2 leading-tight">
                          {event.title}
                        </h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {event.description}
                        </p>
                        {event.studentName && (
                          <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px]">
                              👤
                            </div>
                            <span className="text-xs font-medium text-foreground">{event.studentName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
