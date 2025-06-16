import { CommentEntity, PostEntity, RatingEntity, UserEntity } from "#LocalProject/Entities";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

@Injectable()
export class PostManagerService {
  constructor(
    @InjectRepository(PostEntity)
    private readonly postRepository: Repository<PostEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,
    @InjectRepository(RatingEntity)
    private readonly ratingRepository: Repository<RatingEntity>,
  ) {}

  createPost;
  updatePost;
  deletePost;
  fetchPost;
  fetchPostsByUser;
  fetchPostsByProject;
  createComment;
  updateComment;
  deleteComment;
  fetchCommentsByPost;
  vote(postId, userId, voteKind);
}
