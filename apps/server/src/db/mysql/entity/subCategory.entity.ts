import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn} from 'typeorm';
import { Category } from './category.entity';
//wtf
@Entity('subcategory')
export class SubCategoryEntity {
  @PrimaryGeneratedColumn()
  id: bigint;

  @Column({ unique: true })
  name: string;

  @ManyToOne(() => Category, (category) => category.subCategories)
  @JoinColumn({ name: 'category_id' })
  category: Category;
}