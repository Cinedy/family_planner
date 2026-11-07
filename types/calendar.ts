export type SerializedEvent = {
  id: string
  title: string
  description: string | null
  startTime: string
  endTime: string | null
  allDay: boolean
  color: string | null
  recurrence: string | null
  createdById: string
  familyId: string
  attendees: {
    userId: string
    user: {
      id: string
      name: string | null
      image: string | null
    }
  }[]
  createdBy: {
    id: string
    name: string | null
    image: string | null
  }
}

export type FamilyMemberForCalendar = {
  id: string
  name: string | null
  image: string | null
}
