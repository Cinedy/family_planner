import { UtensilsCrossed } from "lucide-react"

export default function MealsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Måltidsplan</h1>
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
        <UtensilsCrossed className="h-12 w-12 mb-4 opacity-30" />
        <p className="font-medium">Ukens måltider</p>
        <p className="text-sm mt-1">Kommer i fase 5</p>
      </div>
    </div>
  )
}
