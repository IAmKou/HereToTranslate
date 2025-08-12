export interface Task2 {
  subtasks: PageTranslationSubtask[];
  projectId: unknown;
}

type UserId = bigint;

export interface PageTranslationSubtask {
  workCount: number;
  estimatedDue: Date;
  kind: SubtaskKind;
  assignee: UserId[];
  reviewer: UserId[];
  approver: UserId[];
  rating: SubtaskRating;
  // status: /* extern */ SubtaskStatus;
}

export interface SubtaskRating {
  quality: number;
  speed: number;
  communication: number;
  overall: number;
}

enum SubtaskKind {
  Discreet = 'discreet',
  Range = 'range',
}

// export enum SubtaskStatus {
//   Open = 'open',
//   InProgress = 'in_progress',
//   Completed = 'completed',
//   Review = 'review',
//   Paused = 'paused',
//   Cancelled = 'cancelled',
//   Abandoned = 'abandoned'
// }
