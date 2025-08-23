import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTaskCommentTable1710000000001 implements MigrationInterface {
  name = 'CreateTaskCommentTable1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`task_comment\` (
        \`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
        \`content\` text NOT NULL,
        \`isEdited\` tinyint NOT NULL DEFAULT '0',
        \`attachments\` json DEFAULT NULL,
        \`mentions\` json DEFAULT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`taskId\` bigint unsigned NOT NULL,
        \`authorId\` bigint unsigned NOT NULL,
        \`parentCommentId\` bigint unsigned DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`IDX_task_comment_task\` (\`taskId\`),
        KEY \`IDX_task_comment_author\` (\`authorId\`),
        KEY \`IDX_task_comment_parent\` (\`parentCommentId\`),
        CONSTRAINT \`FK_task_comment_task\` FOREIGN KEY (\`taskId\`) REFERENCES \`task\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_task_comment_author\` FOREIGN KEY (\`authorId\`) REFERENCES \`user\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_task_comment_parent\` FOREIGN KEY (\`parentCommentId\`) REFERENCES \`task_comment\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE \`task_comment\`
    `);
  }
}
