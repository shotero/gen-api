const path = require('path');

module.exports = {
  db: {
    database: 'db',
    user: 'user'
  },
  generate: {
    controller: true,
    route: true
  },
  path: {
    import: '#api',
    write: path.join(process.cwd(), 'test')
  },
  schemas: [
    {
      name: 'public',
      renames: {},
      ignores: ['world', 'hello']
    }
  ]
};
