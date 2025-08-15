import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveCommentThreadUnique1710000000001 implements MigrationInterface {
  name = 'RemoveCommentThreadUnique1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Xóa unique constraint trên comments table
    await queryRunner.query(
      `ALTER TABLE \`comments\` DROP INDEX \`IDX_f682eb665c360168731f596b0e\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Thêm lại unique constraint nếu cần rollback
    await queryRunner.query(
      `ALTER TABLE \`comments\` ADD UNIQUE INDEX \`IDX_f682eb665c360168731f596b0e\` (\`threadId\`)`
    );
  }
}
