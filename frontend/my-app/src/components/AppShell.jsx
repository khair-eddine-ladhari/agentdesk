import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppShell({ title, pendingCount = 0, children }) {
  return (
    <div className="flex h-screen bg-white">
      <Sidebar pendingCount={pendingCount} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar title={title} />
        <main className="flex-1 overflow-y-auto p-6 bg-white">{children}</main>
      </div>
    </div>
  );
}