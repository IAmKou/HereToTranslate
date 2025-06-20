import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('usertype')
export class UserTypeEntity {

  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @Column()
  name: string;

  @OneToMany(() => UserEntity, user => user.role)
  users: UserEntity[];
}
