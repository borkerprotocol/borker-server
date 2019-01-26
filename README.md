# borker

Censorship-resistant news sharing on Degecoin.

## Installation Instructions:

### Install PostgreSQL if not installed
https://www.postgresql.org/download

### Create the database
```psql postgres```

```CREATE DATABASE borker;```

```\q```

### Clone the repository
```git clone https://github.com/MattDHill/borker-server.git```

### Go into the directory
```cd borker```

### Copy borkerconfig.json from default
```cp borker-config.json borkerconfig.json```

### Edit borkerconfig.json to contain your own values and starting block preference

### Install packages
```npm install```

### Build Borker
```npm run build```

### Start the server and Bork on
```npm run start```

## * To develop and run tests *

### Create the test database
```psql postgres```

```CREATE DATABASE borker_test;```

```\q```

### Run the test suite
```npm run test```
