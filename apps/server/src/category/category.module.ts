import { Module } from "@nestjs/common";
import { CategoryService } from "./category.service";
import { CategoryController } from "./category.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Category } from "../db/mysql/entity/category.entity";
import { SubCategoryEntity } from "../db/mysql/entity/subCategory.entity";

@Module({
    imports: [TypeOrmModule.forFeature([Category, SubCategoryEntity])],
    controllers: [CategoryController],
    providers: [CategoryService],
    exports: [CategoryService]
})
export class CategoryModule {}
