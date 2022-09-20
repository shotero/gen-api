import { cosmiconfigSync } from 'cosmiconfig';
import path from 'node:path';

function getConfig(config) {
  const explorer = cosmiconfigSync(config);
  return explorer.search(process.cwd());
}

const defaultPrettierConfig = {
  tabWidth: 2,
  printWidth: 80,
  singleQuote: true,
  bracketSpacing: true,
  semi: true,
  trailingComma: 'none'
};

const schemaConfig = getConfig('genschema');
const prettierConfig = getConfig('prettier') || defaultPrettierConfig;
const generatorConfig = Object.assign({}, schemaConfig, getConfig('generator'));

export { schemaConfig, prettierConfig, generatorConfig };
