import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Category } from './category.entity';

@Entity('subcategory')
export class SubCategoryEntity {
  @PrimaryGeneratedColumn()
  id: bigint;

  @Column({ unique: true })
  name: string;

  @ManyToOne(() => Category, category => category.subCategories, { onDelete: 'CASCADE'})
  @JoinColumn({ name: 'categoryId' })
  category: Category;

}