# Gen API

Generate ObjectionJS models automatically from postgresql database

## Install

`npm install @shotero/gen-api`

## Usage

- Create configuration(checkout sample config)
- Create a generator script in your project repository with the following content

```js
import { generate } from '@shotero/gen-api';

generate();
```

Run the script

## Example project:

https://github.com/shotero/mates-backend

## Configuration

> .generatorrc.js

```js
module.exports = {
  baseUrl: 'https://myproject.com',
  schemaVersion: 'http://json-schema.org/draft-07/schema#',
  generate: {
    controller: true,
    route: true
  },
  paths: {
    import: '#api',
    write: process.cwd()
  },
  db: {
    database: 'mydb',
    user: 'me'
  },
  schemas: [
    {
      name: 'public',
      renames: {},
      ignores: ['hello']
    }
  ]
};
```
