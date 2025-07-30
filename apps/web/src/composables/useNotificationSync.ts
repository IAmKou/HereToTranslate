import { ref, reactive } from 'vue'

// Shared notification state
export const notificationEvents = reactive({
  onNotificationDeleted: [] as Array<(id: string) => void>,
  onNotificationMarkedRead: [] as Array<(id: string) => void>,
  onAllNotificationsDeleted: [] as Array<() => void>,
  onAllNotificationsMarkedRead: [] as Array<() => void>,
})

export const useNotificationSync = () => {
  // Event emitters
  const emitNotificationDeleted = (id: string) => {
    notificationEvents.onNotificationDeleted.forEach(callback => callback(id))
  }

  const emitNotificationMarkedRead = (id: string) => {
    notificationEvents.onNotificationMarkedRead.forEach(callback => callback(id))
  }

  const emitAllNotificationsDeleted = () => {
    notificationEvents.onAllNotificationsDeleted.forEach(callback => callback())
  }

  const emitAllNotificationsMarkedRead = () => {
    notificationEvents.onAllNotificationsMarkedRead.forEach(callback => callback())
  }

  // Event listeners
  const onNotificationDeleted = (callback: (id: string) => void) => {
    notificationEvents.onNotificationDeleted.push(callback)

    // Return cleanup function
    return () => {
      const index = notificationEvents.onNotificationDeleted.indexOf(callback)
      if (index > -1) {
        notificationEvents.onNotificationDeleted.splice(index, 1)
      }
    }
  }

  const onNotificationMarkedRead = (callback: (id: string) => void) => {
    notificationEvents.onNotificationMarkedRead.push(callback)

    return () => {
      const index = notificationEvents.onNotificationMarkedRead.indexOf(callback)
      if (index > -1) {
        notificationEvents.onNotificationMarkedRead.splice(index, 1)
      }
    }
  }

  const onAllNotificationsDeleted = (callback: () => void) => {
    notificationEvents.onAllNotificationsDeleted.push(callback)

    return () => {
      const index = notificationEvents.onAllNotificationsDeleted.indexOf(callback)
      if (index > -1) {
        notificationEvents.onAllNotificationsDeleted.splice(index, 1)
      }
    }
  }

  const onAllNotificationsMarkedRead = (callback: () => void) => {
    notificationEvents.onAllNotificationsMarkedRead.push(callback)

    return () => {
      const index = notificationEvents.onAllNotificationsMarkedRead.indexOf(callback)
      if (index > -1) {
        notificationEvents.onAllNotificationsMarkedRead.splice(index, 1)
      }
    }
  }

  return {
    // Emitters
    emitNotificationDeleted,
    emitNotificationMarkedRead,
    emitAllNotificationsDeleted,
    emitAllNotificationsMarkedRead,

    // Listeners
    onNotificationDeleted,
    onNotificationMarkedRead,
    onAllNotificationsDeleted,
    onAllNotificationsMarkedRead,
  }
}
