import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { ProjectGroupEntity } from './projectGroup.entity';

@Entity('task')
export class TaskEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ['pending', 'in_progress', 'completed'], default: 'pending' })
  status: string;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  assignedTo: UserEntity;

  @ManyToOne(() => ProjectGroupEntity, { nullable: true, onDelete: 'SET NULL' })
  group: ProjectGroupEntity;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  createdBy: UserEntity;

  @Column({ type: 'date', nullable: true })
  dueDate: Date;

  @CreateDateColumn()
  createdAt: Date;
}
