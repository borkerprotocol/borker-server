import { SqliteConnectionOptions } from 'typeorm/driver/sqlite/SqliteConnectionOptions'

export const database: SqliteConnectionOptions = {
  type: 'sqlite',
  database: 'test/borker_testdb.sql',
  entities: [ 'src/db/entities/*.ts' ],
  migrations: [ 'src/db/migrations/*.ts' ],
  logging: false,
}