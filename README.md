# Gen Model

Generate ObjectionJS models automatically from postgresql database

## Install

`npm install @shotero/gen-model`

## Usage

- Create configuration(checkout sample config)
- Create a generator script in your project repository with the following content

```js
import { generateModel } from '@shotero/gen-model';

generateModel(config);
```

Run the script

## Example project:

https://github.com/shotero/starter-backend

## Configuration

```js
module.exports = {
  baseUrl: 'https://myproject.com',
  schemaVersion: 'http://json-schema.org/draft-07/schema#',
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
