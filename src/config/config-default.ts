import { ConnectionOptions } from "typeorm"

const database: ConnectionOptions = {
  type: 'postgres',
  database: 'borker',
  host: 'localhost',
  port: 5432,
  username: '',
  password: '',
  entities: [ 'src/db/entities/*.ts' ],
  logging: true,
  migrations: [ 'src/db/migrations*.ts' ],
  migrationsRun: false,
}

export const config = {
	externalip: '',
	rpcusername: '',
  rpcpassword: '',
  database,
}