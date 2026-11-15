export type SerializedEvent = {
  id: string
  title: string
  description: string | null
  startTime: string
  endTime: string | null
  allDay: boolean
  color: string | null
  recurrence: string | null
  /** Days ("yyyy-MM-dd") skipped in a repeating event */
  recurrenceExceptions: string[]
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
