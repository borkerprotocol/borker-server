# borker

Censorship-resistant news sharing on Degecoin.

## Installation Instructions:

### Install Node.js if not installed
https://github.com/nodesource/distributions/blob/master/README.md

* confirm installation with:

```node -v```

```npm -v```

### Install typescript if not installed
```npm install -g typescript```

### Install PostgreSQL if not installed
https://www.postgresql.org/download

### Create the database
```sudo -u postgres psql```

```CREATE USER <user> WITH PASSWORD <password>;```

```CREATE DATABASE borker;```

```\q```

### Clone the repository
```git clone https://github.com/MattDHill/borker-server.git```

### Go into the directory
```cd borker```

### Copy borkerconfig.json from default
```cp borker-config.json borkerconfig.json```

### Edit borkerconfig.json to contain your own Dogecoin values and starting block preference

### Edit ormconfig.json to contain your own psotgreSQL values

### Install packages
```npm install```

### Build Borker
```npm run build```

### Start the server and Bork on
```npm run start```

## * To develop and run tests *

### Create the test database
```sudo -u postgres psql```

```CREATE DATABASE borker_test;```

```\q```

### Run the test suite
```npm run test```
