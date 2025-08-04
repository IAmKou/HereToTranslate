import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { AuthEntity } from './entity/auth.entity';

export class SqliteConnection {

  private readonly _dataSource: DataSource;

  private readonly logger = new Logger(SqliteConnection.name);

  constructor(
  ) {
    this._dataSource = new DataSource({
      type: 'sqlite',
      database: '/tmp/dev.sqlite',
      synchronize: true,
      logging: true,
      entities: [AuthEntity],
    });
  }

  async init() {
    try {
      await this._dataSource.initialize();
      this.logger.log('SQLite connection initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing SQLite connection', error);
      throw error;
    }
  }

  get dataSource(): DataSource {
    return this._dataSource;
  }
}
