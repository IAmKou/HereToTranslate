import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('settings')
export class SettingsEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  key: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 5.0 })
  value: number;
}
