import { Link, useLocation } from "wouter";
import { 
  Map as MapIcon, 
  BrainCircuit, 
  Network, 
  History, 
  LayoutDashboard 
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", label: "Campus", icon: MapIcon },
  { path: "/memory", label: "Memory", icon: BrainCircuit },
  { path: "/graph", label: "Knowledge Graph", icon: Network },
  { path: "/timeline", label: "Timeline", icon: History },
  { path: "/admin", label: "Admin", icon: LayoutDashboard },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground min-h-screen border-r border-sidebar-border flex flex-col shadow-xl z-20">
      <div className="p-6">
        <h1 className="font-serif text-2xl tracking-tight text-sidebar-primary flex items-center gap-2">
          <BrainCircuit className="w-6 h-6 text-sidebar-ring" />
          CampusSphere
        </h1>
        <p className="text-sidebar-foreground/70 text-sm mt-1 font-sans">
          Virtual AI Campus
        </p>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const isActive = location === item.path;
          return (
            <Link key={item.path} href={item.path}>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors duration-200 text-sm font-medium",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 text-xs text-sidebar-foreground/50 border-t border-sidebar-border mt-auto">
        &copy; {new Date().getFullYear()} CampusSphere
      </div>
    </aside>
  );
}
