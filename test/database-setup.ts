import { DataSource } from 'typeorm';
import { Payments } from '../src/payments/entities/payment.entity';

export const createTestDataSource = (): DataSource => {
  return new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USERNAME || 'test_user',
    password: process.env.DATABASE_PASSWORD || 'test_password',
    database: process.env.DATABASE_NAME || 'keeper_payment_test',
    entities: [Payments],
    synchronize: true, // Auto-create tables for tests
    dropSchema: true, // Drop schema before each test run
    logging: false, // Disable logging for tests
  });
};

export const setupTestDatabase = async (): Promise<DataSource> => {
  const dataSource = createTestDataSource();
  await dataSource.initialize();
  return dataSource;
};

export const teardownTestDatabase = async (dataSource: DataSource): Promise<void> => {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
};

export const clearTestDatabase = async (dataSource: DataSource): Promise<void> => {
  if (dataSource.isInitialized) {
    const entityManager = dataSource.manager;
    const entities = dataSource.entityMetadatas;
    
    for (const entity of entities) {
      const repository = entityManager.getRepository(entity.name);
      await repository.clear();
    }
  }
};
