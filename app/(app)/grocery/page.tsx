import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getFamilyForUser } from "@/lib/family"
import { getOrCreateGroceryList } from "@/lib/grocery"
import { GroceryClient } from "@/components/grocery/GroceryClient"
import type { SerializedGroceryItem } from "@/types/grocery"

export default async function GroceryPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const membership = await getFamilyForUser(session.user.id)
  if (!membership) redirect("/onboarding")

  const list = await getOrCreateGroceryList(membership.familyId, session.user.id)

  const items: SerializedGroceryItem[] = list.items.map((item) => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    checked: item.checked,
    createdAt: item.createdAt.toISOString(),
  }))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Handleliste</h1>
      <GroceryClient listId={list.id} initialItems={items} />
    </div>
  )
}
