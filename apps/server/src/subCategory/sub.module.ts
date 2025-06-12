import { Module } from "@nestjs/common";
import { SubCategoryController } from "./sub.controller";
import { SubCategoryService } from "./sub.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SubCategoryEntity } from "../db/mysql/entity/subCategory.entity";

@Module({
    imports: [TypeOrmModule.forFeature([SubCategoryEntity])],
    controllers: [SubCategoryController],
    providers: [SubCategoryService],
    exports: [SubCategoryService]
})
export class SubCategoryModule {}