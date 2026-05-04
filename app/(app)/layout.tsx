import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/nav/sidebar"
import { BottomTabBar } from "@/components/nav/bottom-tab-bar"
import { TopHeader } from "@/components/nav/top-header"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <TopHeader />
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4 md:p-6">
          {children}
        </main>
      </div>
      <BottomTabBar />
    </div>
  )
}
