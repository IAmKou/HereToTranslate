declare module 'socket.io-client' {
  export interface Socket {
    on(event: string, callback: (data: any) => void): this;
    emit(event: string, data: any): this;
    connect(): this;
    disconnect(): this;
  }

  export function io(url: string, options?: any): Socket;
} 