import { ConnectionOptions } from "typeorm"

const database: ConnectionOptions = {
  type: 'postgres',
  database: 'borker',
  host: 'localhost',
  port: 5432,
  username: '',
  password: '',
  entities: [ 'dist/src/db/entities/*.js' ],
  migrations: [ 'dist/src/db/migrations/*.js' ],
  logging: true,
  migrationsRun: false,
}

export const config = {
	externalip: '',
	rpcusername: '',
  rpcpassword: '',
  database,
}