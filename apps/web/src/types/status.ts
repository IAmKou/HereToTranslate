export enum StatusType {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  CLOSED = 'closed',
}

export interface TaskStatus {
  id: string;
  name: string;
  description?: string;
  color: string;
  type: StatusType;
  isActive: boolean;
}
