  // declare module 'socket.io-client' {
  //   export interface Socket {
  //     on(event: string, callback: (data: any) => void): this;
  //     emit(event: string, data: any): this;
  //     connect(): this;
  //     disconnect(): this;
  //   }
  //
  //   export function io(url: string, options?: any): Socket;
  // }
  // socket.io-client.d.ts
  declare module 'socket.io-client' {
    export interface Socket {
      id: string;
      connected: boolean;

      on(event: 'connect', callback: () => void): this;
      on(event: 'connect_error', callback: (error: any) => void): this;
      on(event: 'joined_room', callback: (roomId: string) => void): this;
      on(event: 'new_message', callback: (message: any) => void): this;

      on(event: string, callback: (...args: any[]) => void): this;
      emit(event: string, ...args: any[]): this;

      connect(): this;
      disconnect(): this;
    }

    export function io(url: string, options?: any): Socket;
  }
