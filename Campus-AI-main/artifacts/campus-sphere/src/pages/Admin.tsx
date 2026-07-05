import React from "react";
import { useGetAdminStats, useGetRecentActivity } from "@workspace/api-client-react";
import { 
  Users, 
  MessageSquare, 
  Database, 
  Activity, 
  CircleDot, 
  LayoutDashboard,
  Loader2
} from "lucide-react";
import { format } from "date-fns";

export default function AdminDashboard() {
  const { data: stats, isLoading: loadingStats } = useGetAdminStats();
  const { data: activities, isLoading: loadingActivities } = useGetRecentActivity();

  if (loadingStats || loadingActivities) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Students",
      value: stats?.totalStudents || 0,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20"
    },
    {
      title: "Online Now",
      value: stats?.onlineStudents || 0,
      icon: CircleDot,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20"
    },
    {
      title: "Total Conversations",
      value: stats?.totalConversations || 0,
      icon: MessageSquare,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20"
    },
    {
      title: "Total Messages",
      value: stats?.totalMessages || 0,
      icon: Activity,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20"
    },
    {
      title: "Memory Entries",
      value: stats?.totalMemoryEntries || 0,
      icon: Database,
      color: "text-rose-500",
      bgColor: "bg-rose-500/10",
      borderColor: "border-rose-500/20"
    },
    {
      title: "Active Today",
      value: stats?.activeToday || 0,
      icon: LayoutDashboard,
      color: "text-teal-500",
      bgColor: "bg-teal-500/10",
      borderColor: "border-teal-500/20"
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <LayoutDashboard className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground font-sans mt-1">Campus activity overview and system statistics.</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat, index) => (
            <div 
              key={index}
              className={`bg-card rounded-2xl p-6 border ${stat.borderColor} shadow-sm flex items-center justify-between transition-transform hover:-translate-y-1 hover:shadow-md`}
            >
              <div>
                <p className="text-muted-foreground font-medium text-sm mb-1">{stat.title}</p>
                <h3 className="font-sans text-3xl font-bold text-foreground">{stat.value.toLocaleString()}</h3>
              </div>
              <div className={`p-4 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border bg-muted/20">
            <h2 className="font-serif text-xl font-bold text-foreground flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Recent Activity Feed
            </h2>
          </div>
          
          <div className="divide-y divide-border">
            {!activities || activities.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Activity className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>No recent activity to display.</p>
              </div>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="p-4 hover:bg-muted/10 transition-colors flex items-start gap-4">
                  <div className="p-2 bg-secondary/10 rounded-lg shrink-0 mt-1">
                    <Activity className="w-4 h-4 text-secondary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <p className="font-medium text-foreground text-sm font-sans truncate">
                        {activity.description}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap bg-muted px-2 py-0.5 rounded-md font-mono">
                        {format(new Date(activity.timestamp), "MMM d, h:mm a")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground bg-background border border-border px-1.5 py-0.5 rounded shadow-sm uppercase tracking-wider font-mono text-[10px]">
                        {activity.type.replace('_', ' ')}
                      </span>
                      {activity.studentName && (
                        <span className="flex items-center gap-1.5 text-primary font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
                          {activity.studentName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
