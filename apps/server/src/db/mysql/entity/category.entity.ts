import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { ProjectEntity } from './project.entity';
import { SubCategoryEntity } from './subCategory.entity';

@Entity('category')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ProjectEntity, project => project.category)
  project: ProjectEntity[];

  @OneToMany(() => SubCategoryEntity, subCategory => subCategory.category, {cascade: true, eager: true})
  subCategories: SubCategoryEntity[];
}
