import { ConnectionOptions } from "typeorm"

export const database: ConnectionOptions = {
  type: 'postgres',
  database: 'borker_test',
  host: 'localhost',
  port: 5432,
  username: '',
  password: '',
  entities: [ 'src/db/entities/*.ts' ],
  migrations: [ 'src/db/migrations/*.ts' ],
  logging: true,
}