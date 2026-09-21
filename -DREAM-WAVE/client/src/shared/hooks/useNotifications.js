import { usePlatformData } from '../context/PlatformDataContext'

export default function useNotifications() {
  const {
    notifications: items,
    unread,
    notificationsLoading: loading,
    notificationError: error,
    loadNotifications: load,
    markRead,
    markAllRead,
    archiveNotification: archive,
    restoreNotification: restore,
    pinNotification: pin,
    removeNotification: remove,
    setNotificationPriority: setPriority,
  } = usePlatformData()
  return { items, unread, loading, error, load, markRead, markAllRead, archive, restore, pin, remove, setPriority }
}
