import { TodoClient } from "@/components/todos/TodoClient"

export default function TodosPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Gjøremål</h1>
      <TodoClient />
    </div>
  )
}
