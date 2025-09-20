import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTranslationPreviewTable20250919 implements MigrationInterface {
  name = 'CreateTranslationPreviewTable20250919';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`translation_previews\` (
        \`id\` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
        \`requestId\` bigint UNSIGNED NOT NULL,
        \`userId\` bigint UNSIGNED NOT NULL,
        \`previewPages\` json NOT NULL,
        \`feedback\` text NULL,
        \`isApproved\` tinyint(1) NOT NULL DEFAULT 0,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_tp_request\` FOREIGN KEY (\`requestId\`) REFERENCES \`requests\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_tp_user\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `translation_previews`');
  }
}


