# borker

Censorship-resistant news sharing on Degecoin.

## Installation Instructions:

### Clone the repository
```git clone git@github.com:MattDHill/borker-server.git```
#### or
```git clone https://github.com/MattDHill/borker-server.git```

### Go into the directory
```cd borker```

### Install dependencies
```npm install```

### Build it
```npm run build```

### Install PostgreSQL if not installed
https://www.postgresql.org/download

### Create the database
```psql postgres```

```CREATE DATABASE borker;```

```\q```

### Start the server and Bork on
```npm run start```

## * To develop and run tests *

### Create the test database
```psql postgres```

```CREATE DATABASE borker_test;```

```\q```

### Run the test suite
```npm run test```
