import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import pgStructure from 'pg-structure';
import pluralize from 'pluralize';
import prettier from 'prettier';
import { pascalCase } from './helpers.js';
import { prettierConfig, generatorConfig } from './config.js';
import { getEntity } from '@shotero/gen-schema';

// load from import path
const writeRoot = generatorConfig.path.write;
const importRoot = generatorConfig.path.import;

function write(path, content) {
  fs.writeFile(path, content, (err) => {
    if (err) throw err;
    console.log(`${path}: file written`);
  });
}

function getRelations(relations) {
  const rels = relations.map((rel) => {
    if (rel.constructor.name == 'M2MRelation')
      return getManyToManyRelation(rel);
    if (rel.constructor.name == 'O2MRelation') return getHasManyRelation(rel);
    if (rel.constructor.name == 'M2ORelation')
      return getBelongsToOneRelation(rel);
  });

  return rels;
}

function getImports(table, relations) {
  const relMap = new Map();
  relations.forEach((rel) => {
    if (rel.targetTable.name != table.name) {
      relMap.set(
        pascalCase(pluralize.singular(rel.targetTable.name)),
        path.normalize(
          `${importRoot}/${rel.targetTable.schema.name}/${rel.targetTable.name}/model.js`
        )
      );
    }
  });
  const relString = [];
  relMap.forEach((path, cls) => {
    relString.push(`import ${cls} from '${path}';`);
  });
  return relString;
}

function getManyToManyRelation(rel) {
  return `${rel.name}: {
      relation: Base.ManyToManyRelation,
      modelClass: path.join(
        importRoot,
        '${rel.targetTable.schema.name}',
        '${rel.targetTable.name}',
        'model'
      ),
      join: {
        from: '${rel.sourceTable.schema.name}.${rel.sourceTable.name}.${rel.sourceTable.primaryKey.columns[0].name}',
        through: {
          from: '${rel.foreignKey.table.schema.name}.${rel.foreignKey.table.name}.${rel.foreignKey.columns[0].name}',
          to: '${rel.foreignKey.table.schema.name}.${rel.foreignKey.table.name}.${rel.foreignKey.columns[0].name}',
          extra: []
        },
        to: '${rel.targetTable.schema.name}.${rel.targetTable.name}.${rel.targetTable.primaryKey.columns[0].name}'
      }
    }`;
}

function getHasManyRelation(rel) {
  if (!rel.name) {
    console.error(
      `${rel.targetTable.name} does not exist on ${rel.sourceTable.name}!`
    );
    return;
  }
  return `${rel.name}: {
    relation: Base.HasManyRelation,
    modelClass: ${pascalCase(pluralize.singular(rel.targetTable.name))},
    join: {
      from: '${rel.sourceTable.schema.name}.${rel.sourceTable.name}.${
    rel.sourceTable.primaryKey.columns[0].name
  }',
      to: '${rel.targetTable.schema.name}.${rel.targetTable.name}.${
    rel.foreignKey.columns[0].name
  }'
    }
  }`;
}

function getBelongsToOneRelation(rel) {
  return `${rel.name}: {
    relation: Base.BelongsToOneRelation,
    modelClass: ${pascalCase(pluralize.singular(rel.targetTable.name))},
    join: {
      from: '${rel.sourceTable.schema.name}.${rel.sourceTable.name}.${
    rel.foreignKey.columns[0].name
  }',
      to: '${rel.targetTable.schema.name}.${rel.targetTable.name}.${
    rel.targetTable.primaryKey.columns[0].name
  }'
    }
  }`;
}

function generateModel(table, path, resource) {
  const className = pascalCase(resource);
  const relString = `{${getRelations(
    table.relations.filter(
      (rel) => rel.constructor.name != 'M2MRelation' && rel.name
    )
  ).join(',')}}`;
  const importString = `${getImports(
    table,
    table.relations.filter(
      (rel) => rel.constructor.name != 'M2MRelation' && rel.name
    )
  )
    .sort()
    .join('\n')}`;
  const relHash = crypto.createHash('md5').update(relString).digest('hex');

  if (fs.existsSync(path)) {
    const filecontent = fs.readFileSync(path, 'utf8');
    const imports = filecontent.replace(
      /\/\/ REL_START.*[\s\S]*REL_END/gm,
      `// REL_START
      const relations = ${relString}
      // REL_END`
    );
    const rels = imports.replace(
      /\/\/ IMPORT_START.*[\s\S]*IMPORT_END/gm,
      `// IMPORT_START
      ${importString}
      // IMPORT_END`
    );

    write(
      path,
      prettier.format(rels, Object.assign({ parser: 'babel' }, prettierConfig))
    );
  } else {
    const template = `import Base from '${importRoot}/model.js';
import schema from './schema.json' assert { type: 'json' };
// IMPORT_START
${importString}
// IMPORT_END

class ${className} extends Base {
  static get tableName() {
    return '${table.schema.name}.${table.name}';
  }

  static get jsonSchema() {
    return Object.assign(schema, ${className}.schemaOverrides());
  }

  static get relationMappings() {
    // REL_START
    const relations = ${relString};
    // REL_END
    return Object.assign(relations, ${className}.relOverrides());
  }

  static relOverrides() {
    return {};
  }

  static schemaOverrides() {
    return {};
  }
}

export default ${className};
`;

    write(
      path,
      prettier.format(
        template,
        Object.assign({ parser: 'babel' }, prettierConfig)
      )
    );
  }
}

// doesn't overwrite
function generateRouter(path, resource) {
  if (fs.existsSync(path)) {
    return;
  }
  const template = `import Router from '@koa/router';
import controller from './controller.js';

const router = new Router();

router.get('/', controller.list.bind(controller));
router.get('/:${resource}_id', controller.show.bind(controller));
router.post('/', controller.create.bind(controller));
router.put('/:${resource}_id', controller.update.bind(controller));
router.del('/:${resource}_id', controller.destroy.bind(controller));

export default router;
`;
  write(path, template);
}

function generateController(path, resource) {
  if (fs.existsSync(path)) {
    return;
  }
  const template = `import BaseController from '${importRoot}/controller.js';
import model from './model.js';

const controller = new BaseController(model, '${resource}_id');

export default controller;
`;
  write(path, template);
}

function isSame(a, b) {
  const hashA = crypto.createHash('md5').update(a).digest('hex');
  const hashB = crypto.createHash('md5').update(b).digest('hex');
  return hashA === hashB;
}

function generateSchema(table, config, filepath) {
  try {
    const entity = getEntity(table, config);
    const jsonSchema = JSON.stringify(entity, null, 2);
    if (fs.existsSync(filepath)) {
      const fileContent = fs.readFileSync(filepath, 'utf8');
      if (!isSame(jsonSchema, fileContent)) {
        console.log(
          `${table.schema.name}.${table.name} mismatches with the existing file content. Generating...`
        );

        write(filepath, jsonSchema);
      }
    } else {
      console.log(
        `${table.schema.name}.${table.name} file does not exist. Generating...`
      );
      write(filepath, jsonSchema);
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

async function generate(override = {}) {
  const config = Object.assign({}, generatorConfig.config, override);
  const schemas = config.schemas.map((i) => i.name);
  const db = await pgStructure.default(
    {
      database: config.db.database,
      user: config.db.user,
      password: config.db.password
    },
    { includeSchemas: schemas }
  );

  const collection = {};
  for (const dbSchema of schemas) {
    const schema = db.get(dbSchema);
    collection[schema.name] = {};
    const schemaSettings = config.schemas.find((s) => s.name === schema.name);
    const tables = schema.tables.filter(
      (table) => !schemaSettings.ignores.includes(table.name)
    );
    for (const table of tables) {
      collection[schema.name][table.name] = getEntity(table, config);
      const dir = `${writeRoot}/${table.schema.name}/${table.name}`;
      const resource = pluralize.singular(table.name);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      generateSchema(table, config, `${dir}/schema.json`);
      generateModel(table, `${dir}/model.js`, resource);
      if (config.generate.controller) {
        generateController(`${dir}/controller.js`, resource);
      }
      if (config.generate.route) {
        generateRouter(`${dir}/index.js`, resource);
      }
    }
  }

  return collection;
}

export { generate };
