import { Sidebar } from "@/components/nav/sidebar"
import { BottomTabBar } from "@/components/nav/bottom-tab-bar"
import { TopHeader } from "@/components/nav/top-header"
import { SyncProvider } from "@/components/sync/SyncProvider"
import { ServiceWorkerRegister } from "@/components/sync/ServiceWorkerRegister"

// Static shell: no server data fetching here. proxy.ts guards sign-in, and the
// data comes from the local database, kept up to date by SyncProvider.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <TopHeader />
        <main className="flex-1 overflow-y-auto p-4 pb-tabbar md:p-6">
          <SyncProvider>{children}</SyncProvider>
        </main>
      </div>
      <BottomTabBar />
      <ServiceWorkerRegister />
    </div>
  )
}
