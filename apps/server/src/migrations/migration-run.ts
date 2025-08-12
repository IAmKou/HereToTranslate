import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { MySqlConnection } from '../db/mysql/mysql.connection';

async function runMigrations() {
  const config = new ConfigService();
  const mysqlConnection = new MySqlConnection(config);

  try {
    await mysqlConnection.init();
    const dataSource = mysqlConnection.dataSource;

    // Run pending migrations
    const pendingMigrations = await dataSource.showMigrations();

    if (!pendingMigrations) {
      console.log('No pending migrations to run.');
      return;
    }

    console.log('Running pending migrations...');
    await dataSource.runMigrations();
    console.log('Migrations completed successfully.');

  } catch (error) {
    console.error('Error running migrations:', error);
  } finally {
    await mysqlConnection.close();
  }
}

runMigrations();
