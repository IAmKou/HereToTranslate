export class CreateRequestDto {
  projectId?: number;
  title?: string;
  description?: string;
  dealAmount?: number;
  deadline?: string;
  fileUrl?: string;
  targetUserId?: number;
}
export class UpdateRequestDto {
  id: number;
  title?: string;
  description?: string;
  dealAmount?: number;
  deadline?: string;
  fileUrl?: string;
}

export class ReviewRequestDto {
  id: number;
  status: 'APPROVED' | 'REJECTED';
}
