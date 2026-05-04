import { ShoppingCart } from "lucide-react"

export default function GroceryPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Handleliste</h1>
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
        <ShoppingCart className="h-12 w-12 mb-4 opacity-30" />
        <p className="font-medium">Delte handlelister</p>
        <p className="text-sm mt-1">Kommer i fase 4</p>
      </div>
    </div>
  )
}
