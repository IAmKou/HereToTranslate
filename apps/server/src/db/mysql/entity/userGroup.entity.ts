import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
@Entity('userGroup')
export class userGroupEntity {
  @PrimaryGeneratedColumn()
  id: bigint;

  @Column()
  name: string;

  @Column({type: 'text'})
  description: string;

  @Column()
  createdBy: bigint;

  @CreateDateColumn({type: 'datetime'})
  createdAt: Date;

  @UpdateDateColumn({type: 'datetime'})
  updatedAt: Date;
}
