import { io, Socket } from 'socket.io-client'
import { getChatConfig, getSocketIOConfig } from '../utils/chat-config'
import { useAuthStore } from '../store/auth'

export interface RealtimeNotification {
  id: string
  type: string
  message: string
  createdAt: Date
  isGlobal?: boolean
  userId?: bigint
  createdBy?: {
    id: string
    username: string
    fullName?: string
  }
  createdByUserId?: string
}

export interface NotificationDeleteEvent {
  id: string
}

class RealtimeNotificationService {
  private socket: Socket | null = null
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 2000

  // Event callbacks
  private onNewNotificationCallbacks: Array<(notification: RealtimeNotification) => void> = []
  private onGlobalNotificationCallbacks: Array<(notification: RealtimeNotification) => void> = []
  private onNotificationDeletedCallbacks: Array<(event: NotificationDeleteEvent) => void> = []
  private onConnectedCallbacks: Array<() => void> = []
  private onDisconnectedCallbacks: Array<() => void> = []

  constructor() {
    this.initializeSocket()
  }

  private initializeSocket() {
    try {
      const config = getChatConfig()
      const socketConfig = getSocketIOConfig(config)

      // Create socket connection
      this.socket = io(config.serverUrl, socketConfig)

      this.setupEventListeners()
      this.setupConnectionHandling()
    } catch (error) {
      console.error('Failed to initialize WebSocket connection:', error)
    }
  }

  private setupEventListeners() {
    if (!this.socket) return

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected')
      this.isConnected = true
      this.reconnectAttempts = 0
      this.notifyConnected()
      this.joinUserRoom()
    })

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected')
      this.isConnected = false
      this.notifyDisconnected()
    })

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      this.isConnected = false
      this.notifyDisconnected()
      this.handleReconnection()
    })

    // Notification events
    this.socket.on('new_notification', (notification: RealtimeNotification) => {
      console.log('📨 Received new notification:', notification)
      this.notifyNewNotification(notification)
    })

    this.socket.on('global_notification', (notification: RealtimeNotification) => {
      console.log('📢 Received global notification:', notification)
      this.notifyGlobalNotification(notification)
    })

    this.socket.on('notification_deleted', (event: NotificationDeleteEvent) => {
      console.log('🗑️ Notification deleted:', event)
      this.notifyNotificationDeleted(event)
    })

    this.socket.on('joined_user_room', (userId: string) => {
      console.log('👤 Joined user room:', userId)
    })
  }

  private setupConnectionHandling() {
    if (!this.socket) return

    // Auto-reconnection logic
    this.socket.on('disconnect', () => {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnectAttempts++
          console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
          this.socket?.connect()
        }, this.reconnectDelay * this.reconnectAttempts)
      }
    })
  }

  private async joinUserRoom() {
    if (!this.socket || !this.isConnected) return

    try {
      const authStore = useAuthStore()
      const userId = authStore.user?.id

      if (userId) {
        console.log('👤 Joining user room:', userId)
        this.socket.emit('join_user_room', userId.toString())
      }
    } catch (error) {
      console.error('Failed to join user room:', error)
    }
  }

  private handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++
        console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
        this.initializeSocket()
      }, this.reconnectDelay * this.reconnectAttempts)
    }
  }

  // Public methods for components to subscribe to events
  public onNewNotification(callback: (notification: RealtimeNotification) => void) {
    this.onNewNotificationCallbacks.push(callback)

    // Return cleanup function
    return () => {
      const index = this.onNewNotificationCallbacks.indexOf(callback)
      if (index > -1) {
        this.onNewNotificationCallbacks.splice(index, 1)
      }
    }
  }

  public onGlobalNotification(callback: (notification: RealtimeNotification) => void) {
    this.onGlobalNotificationCallbacks.push(callback)

    return () => {
      const index = this.onGlobalNotificationCallbacks.indexOf(callback)
      if (index > -1) {
        this.onGlobalNotificationCallbacks.splice(index, 1)
      }
    }
  }

  public onNotificationDeleted(callback: (event: NotificationDeleteEvent) => void) {
    this.onNotificationDeletedCallbacks.push(callback)

    return () => {
      const index = this.onNotificationDeletedCallbacks.indexOf(callback)
      if (index > -1) {
        this.onNotificationDeletedCallbacks.splice(index, 1)
      }
    }
  }

  public onConnected(callback: () => void) {
    this.onConnectedCallbacks.push(callback)

    return () => {
      const index = this.onConnectedCallbacks.indexOf(callback)
      if (index > -1) {
        this.onConnectedCallbacks.splice(index, 1)
      }
    }
  }

  public onDisconnected(callback: () => void) {
    this.onDisconnectedCallbacks.push(callback)

    return () => {
      const index = this.onDisconnectedCallbacks.indexOf(callback)
      if (index > -1) {
        this.onDisconnectedCallbacks.splice(index, 1)
      }
    }
  }

  // Private notification methods
  private notifyNewNotification(notification: RealtimeNotification) {
    this.onNewNotificationCallbacks.forEach(callback => callback(notification))
  }

  private notifyGlobalNotification(notification: RealtimeNotification) {
    this.onGlobalNotificationCallbacks.forEach(callback => callback(notification))
  }

  private notifyNotificationDeleted(event: NotificationDeleteEvent) {
    this.onNotificationDeletedCallbacks.forEach(callback => callback(event))
  }

  private notifyConnected() {
    this.onConnectedCallbacks.forEach(callback => callback())
  }

  private notifyDisconnected() {
    this.onDisconnectedCallbacks.forEach(callback => callback())
  }

  // Connection status
  public getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    }
  }

  // Manual reconnection
  public reconnect() {
    if (this.socket) {
      this.socket.disconnect()
    }
    this.reconnectAttempts = 0
    this.initializeSocket()
  }

  // Cleanup
  public disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.isConnected = false
    this.reconnectAttempts = 0
  }
}

// Export singleton instance
export const realtimeNotificationService = new RealtimeNotificationService()

// Export the class for testing purposes
export { RealtimeNotificationService }
