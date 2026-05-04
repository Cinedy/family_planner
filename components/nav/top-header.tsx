import { auth } from "@/auth"
import { UserMenu } from "./user-menu"

export async function TopHeader() {
  const session = await auth()
  const user = session?.user

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b bg-background md:px-6">
      <span className="font-semibold text-sm md:hidden">🏠 Familieplanlegger</span>
      <div className="ml-auto">
        <UserMenu
          name={user?.name}
          email={user?.email}
          image={user?.image}
        />
      </div>
    </header>
  )
}
