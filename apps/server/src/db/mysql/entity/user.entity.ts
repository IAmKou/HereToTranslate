import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, ManyToOne, CreateDateColumn, OneToMany } from 'typeorm';
import { RoleEntity } from './role.entity';
import { JwtTokenEntity} from './jwtTokens.entity';

@Entity('user')
  export class UserEntity{

  @PrimaryGeneratedColumn()
  id: bigint;

  @Column()
  username: string;

  @Column()
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  phone: string;

  @Column()
  fullName: string;

  @Column()
  roleId: number;

  @ManyToOne(() => RoleEntity, role => role.users)
  @JoinColumn({ name: 'roleId' })
  role: RoleEntity;

  @Column()
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => JwtTokenEntity, (token) => token.user)
  tokens: JwtTokenEntity[];
}
