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

  async createPost(dto: { userId: string; content: string; visibility?: any }) {
    const user = await this.userRepository.findOne({ where: { id: BigInt(dto.userId) } });
    if (!user) throw new Error('User not found');
    const post = this.postRepository.create({
      user,
      content: dto.content,
      visibility: dto.visibility ?? 'VISIBLE',
    });
    return this.postRepository.save(post);
  }

  async updatePost(postId: bigint, dto: { content?: string; visibility?: any }) {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) throw new Error('Post not found');
    if (dto.content !== undefined) post.content = dto.content;
    if (dto.visibility !== undefined) post.visibility = dto.visibility;
    return this.postRepository.save(post);
  }

  async deletePost(postId: bigint) {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) throw new Error('Post not found');
    await this.postRepository.delete({ id: postId });
    return { message: 'Post deleted' };
  }

  async fetchPost(postId: bigint) {
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['user', 'comments', 'ratings'],
    });
    if (!post) throw new Error('Post not found');
    return post;
  }

  async fetchPostsByUser(userId: bigint) {
    return this.postRepository.find({
      where: { user: { id: userId } },
      relations: ['user', 'comments', 'ratings'],
    });
  }

  async fetchPostsByProject(projectId: bigint) {
    // Assuming PostEntity has a project relation, otherwise skip this method or adjust as needed
    throw new Error('Not implemented: PostEntity does not have a project relation');
  }

  async createComment(postId: bigint, userId: bigint, content: string) {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) throw new Error('Post not found');
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    const comment = this.commentRepository.create({ post, user, content });
    return this.commentRepository.save(comment);
  }

  async updateComment(commentId: bigint, userId: bigint, content: string) {
    const comment = await this.commentRepository.findOne({ where: { id: commentId }, relations: ['user'] });
    if (!comment) throw new Error('Comment not found');
    if (comment.user.id !== userId) throw new Error('Unauthorized');
    comment.content = content;
    return this.commentRepository.save(comment);
  }

  async deleteComment(commentId: bigint, userId: bigint) {
    const comment = await this.commentRepository.findOne({ where: { id: commentId }, relations: ['user'] });
    if (!comment) throw new Error('Comment not found');
    if (comment.user.id !== userId) throw new Error('Unauthorized');
    await this.commentRepository.delete({ id: commentId });
    return { message: 'Comment deleted' };
  }

  async fetchCommentsByPost(postId: bigint) {
    return this.commentRepository.find({
      where: { post: { id: postId } },
      relations: ['user'],
    });
  }

  async vote(postId: bigint, userId: bigint, score: number) {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) throw new Error('Post not found');
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    let rating = await this.ratingRepository.findOne({ where: { post: { id: postId }, user: { id: userId } } });
    if (!rating) {
      rating = this.ratingRepository.create({ post, user, score });
    } else {
      rating.score = score;
    }
    return this.ratingRepository.save(rating);
  }
}
