import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('role')
export class RoleEntity {

  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: bigint;

  @Column()
  name: string;

  @OneToMany(() => UserEntity, user => user.role)
  users: UserEntity[];
}
