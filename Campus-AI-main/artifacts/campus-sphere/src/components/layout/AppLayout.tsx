import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col relative h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
