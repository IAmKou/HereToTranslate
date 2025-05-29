import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
@Entity('project')
export class ProjectEntity {
  @PrimaryGeneratedColumn()
  id: bigint;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column()
  createdBy: bigint;

  @CreateDateColumn()
  createdAt: Date;

}
