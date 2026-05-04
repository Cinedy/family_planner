import { CheckSquare } from "lucide-react"

export default function TodosPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Gjøremål</h1>
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
        <CheckSquare className="h-12 w-12 mb-4 opacity-30" />
        <p className="font-medium">Gjøremålslister</p>
        <p className="text-sm mt-1">Kommer i fase 4</p>
      </div>
    </div>
  )
}
