# Borker-Server

Borker is a first-of-its-kind, Twitter-like microblogging platform built on top of the Dogecoin p2p network. Borker is open-source, decentralized, borderless, permissionless, pseudonymous, and immutable - affording it a degree of censorship-resistance unparalled in human history.

**Borker-Server serves three purposes:**
  1. Syncing blocks from the dogecoin blockchain, finding transactions that conform to the borker protocol spec, and parsing them out.
  2. Persisting borker-specific data synced from the Dogecoin blockchain.
  3. Serving up a REST API consumable via http.

## API Documentation
### Users API:
https://documenter.getpostman.com/view/7663576/S1ZufC5D
### Borks API:
https://documenter.getpostman.com/view/7663576/S1ZufBzu

## Installation Instructions:

### Install Node.js if not installed
https://github.com/nodesource/distributions/blob/master/README.md

* confirm installation with:

```node -v```

```npm -v```

### Install typescript if not installed
```npm install -g typescript```

### Clone the repository
```git clone https://github.com/borkerprotocol/borker-server.git```

```cd borker-server```

### Copy borkerconfig.json and ormconfig.json from samples
```cp borkerconfig-sample.json borkerconfig.json```

```cp ormconfig-sample.json ormconfig.json```

### Edit borkerconfig.json to contain your own Dogecoin values and starting block preference
*If you are connecting to a remote Dogecoin node, make sure the node is configured to allow your local IP in dogecoin.conf*: ```rpcallowip=```

### Install packages
```npm install```

### Build Borker
```npm run build```

### Start the server and Bork on
```npm start```

## * To run tests *
```npm test```
