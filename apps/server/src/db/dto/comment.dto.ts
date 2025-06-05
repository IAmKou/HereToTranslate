export class CreateCommentDto {
  postId: number;
  content: string;
}

export class UpdateCommentDto {
  id: number;
  content: string;
}

export class ReportCommentDto {
  commentId: number;
  reason: string;
}
