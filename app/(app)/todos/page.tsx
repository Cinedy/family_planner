import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getFamilyForUser } from "@/lib/family"
import { getOrCreateTodoList, getFamilyMembersForTodos } from "@/lib/todos"
import { TodoClient } from "@/components/todos/TodoClient"
import type { SerializedTodoItem } from "@/types/todos"

export default async function TodosPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const membership = await getFamilyForUser(session.user.id)
  if (!membership) redirect("/onboarding")

  const [list, members] = await Promise.all([
    getOrCreateTodoList(membership.familyId, session.user.id),
    getFamilyMembersForTodos(membership.familyId),
  ])

  const items: SerializedTodoItem[] = list.items.map((item) => ({
    id: item.id,
    title: item.title,
    completed: item.completed,
    dueDate: item.dueDate?.toISOString() ?? null,
    assignedToId: item.assignedToId,
    assignedTo: item.assignedTo
      ? {
          id: item.assignedTo.id,
          name: item.assignedTo.name,
          image: item.assignedTo.image,
        }
      : null,
    createdAt: item.createdAt.toISOString(),
  }))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Gjøremål</h1>
      <TodoClient
        listId={list.id}
        initialItems={items}
        familyMembers={members}
        currentUserId={session.user.id}
      />
    </div>
  )
}
