import { PostVisibility } from "#LocalProject/Entities";

export class CreatePostDto {
  userId: string;
  content: string;
  visibility: PostVisibility = PostVisibility.Visible;
}

export class UpdatePostDto {
  content?: string;
  visibility?: PostVisibility;
}
