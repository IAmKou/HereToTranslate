import {Entity, PrimaryGeneratedColumn, Column} from 'typeorm'

@Entity('te1st')
export class MysqlTest{
  @PrimaryGeneratedColumn()
  id : number;
  @Column()
  name : string;
}

