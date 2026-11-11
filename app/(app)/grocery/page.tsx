import { GroceryClient } from "@/components/grocery/GroceryClient"

export default function GroceryPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Handleliste</h1>
      <GroceryClient />
    </div>
  )
}
