# Borker-Server

Borker is a first-of-its-kind, Twitter-like microblogging platform built on top of the Dogecoin p2p network. Borker is open-source, decentralized, borderless, permissionless, pseudonymous, immutable, and censorship-resistant.

Borker-server follows the [Borker Protocol Spec](https://github.com/borkerprotocol/borker-rs/blob/master/protocol-spec.md) and depends on [superdoge](https://github.com/borkerprotocol/superdoge-rs) and the [borker-rs](https://github.com/borkerprotocol/borker-rs) library.

**Borker-Server serves two purposes:**
  1. Syncing and persisting borker-specific data synced from the Dogecoin blockchain.
  2. Serving up a REST API consumable via http.

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

### Copy borkerconfig.json and ormconfig.json files from samples
```cp borkerconfig-sample.json borkerconfig.json```

```cp ormconfig-sample.json ormconfig.json```

### Edit borkerconfig.json
```
"externalip": "", // ip or url of prefered superdoge node. If blank, default is localhost
"start": 2795597, // starting block height to begin sync. Should be greater than or equal to 2795597 (borker genesis)
"ssl": { // optional ssl information for running your node over https
  "cert": "",
  "privkey": "",
  "chain": "",
  "fullchain": ""
}
```
### Install packages
```npm install```

### Build
```npm run build```

### Start the server and Bork on
```npm start```
