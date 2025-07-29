import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { TaskEntity } from '#LocalProject/Entities';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:4200',
      'http://26.82.216.71:4200',
      /^http:\/\/26\.82\.216\.\d+:4200$/  // Allow any IP in RadVPN range
    ],
    credentials: true,
  },
})
export class TaskGateway {
  @WebSocketServer()
  server: Server;

  emitTaskUpdate(task: TaskEntity) {
    this.server.emit('task-updated', {
      id: task.id,
      title: task.title,
      status: task.status,
    });
  }

  emitTaskDelete(taskId: bigint) {
    this.server.emit('task-deleted', {
      id: taskId,
    });
  }
}
