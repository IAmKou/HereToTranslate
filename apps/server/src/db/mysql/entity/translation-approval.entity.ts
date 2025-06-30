import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { RequestEntity } from './request.entity';
import { UserEntity } from './user.entity';


@Entity('translation_approvals')
export class TranslationApprovalEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => RequestEntity)
  request: RequestEntity;

  @ManyToOne(() => UserEntity)
  user: UserEntity;

  @Column()
  isApproved: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
