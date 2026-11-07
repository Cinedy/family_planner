export type SerializedTodoItem = {
  id: string
  title: string
  completed: boolean
  dueDate: string | null
  assignedToId: string | null
  assignedTo: {
    id: string
    name: string | null
    image: string | null
  } | null
  createdAt: string
}

export type SerializedTodoList = {
  id: string
  items: SerializedTodoItem[]
}

export type FamilyMemberForTodos = {
  id: string
  name: string | null
  image: string | null
}
