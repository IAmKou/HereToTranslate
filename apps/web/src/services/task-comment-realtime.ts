import { io, Socket } from 'socket.io-client';

// Types for comment events
export interface TaskCommentEvent {
  comment: {
    id: string;
    content: string;
    taskId: string;
    author: {
      id: string;
      username: string;
      fullName?: string;
      avatarUrl?: string;
    };
    createdAt: string;
    updatedAt?: string;
  };
}

export interface TaskCommentDeleteEvent {
  commentId: string;
  taskId: string;
}

// Event listener types
export type CommentAddedListener = (event: TaskCommentEvent) => void;
export type CommentUpdatedListener = (event: TaskCommentEvent) => void;
export type CommentDeletedListener = (event: TaskCommentDeleteEvent) => void;

class TaskCommentRealtimeService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  // Event listeners
  private commentAddedListeners: CommentAddedListener[] = [];
  private commentUpdatedListeners: CommentUpdatedListener[] = [];
  private commentDeletedListeners: CommentDeletedListener[] = [];

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket() {
    try {
      // Connect to the WebSocket server
      this.socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        path: '/socket.io/',
        forceNew: true,
      });

      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to initialize WebSocket connection:', error);
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Task Comment WebSocket connected');
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
    });

    this.socket.on('disconnect', () => {
      console.log('Task Comment WebSocket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Task Comment WebSocket connection error:', error);
      this.handleReconnection();
    });

    // Comment events
    this.socket.on('comment-added', (event: TaskCommentEvent) => {
      console.log('Comment added event received:', event);
      this.commentAddedListeners.forEach(listener => listener(event));
    });

    this.socket.on('comment-updated', (event: TaskCommentEvent) => {
      console.log('Comment updated event received:', event);
      this.commentUpdatedListeners.forEach(listener => listener(event));
    });

    this.socket.on('comment-deleted', (event: TaskCommentDeleteEvent) => {
      console.log('Comment deleted event received:', event);
      this.commentDeletedListeners.forEach(listener => listener(event));
    });
  }

  private handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      if (this.socket) {
        this.socket.connect();
      } else {
        this.initializeSocket();
      }
    }, delay);
  }

  // Public methods to subscribe to events
  public onCommentAdded(listener: CommentAddedListener) {
    this.commentAddedListeners.push(listener);
  }

  public offCommentAdded(listener: CommentAddedListener) {
    const index = this.commentAddedListeners.indexOf(listener);
    if (index > -1) {
      this.commentAddedListeners.splice(index, 1);
    }
  }

  public onCommentUpdated(listener: CommentUpdatedListener) {
    this.commentUpdatedListeners.push(listener);
  }

  public offCommentUpdated(listener: CommentUpdatedListener) {
    const index = this.commentUpdatedListeners.indexOf(listener);
    if (index > -1) {
      this.commentUpdatedListeners.splice(index, 1);
    }
  }

  public onCommentDeleted(listener: CommentDeletedListener) {
    this.commentDeletedListeners.push(listener);
  }

  public offCommentDeleted(listener: CommentDeletedListener) {
    const index = this.commentDeletedListeners.indexOf(listener);
    if (index > -1) {
      this.commentDeletedListeners.splice(index, 1);
    }
  }

  // Cleanup method
  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Clear all listeners
    this.commentAddedListeners = [];
    this.commentUpdatedListeners = [];
    this.commentDeletedListeners = [];
  }

  // Get connection status
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export const taskCommentRealtimeService = new TaskCommentRealtimeService();
