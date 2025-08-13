export enum StatusType {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

export interface TaskStatus {
  id: string;
  name: string;
  description?: string;
  color: string;
  type: StatusType;

  isActive: boolean;
  isDefault: boolean;
  isStartStatus: boolean;
  isEndStatus: boolean;
  isResolved: boolean;
  isClosed: boolean;
}
