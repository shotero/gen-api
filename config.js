import { cosmiconfigSync } from 'cosmiconfig';
import path from 'node:path';

function getConfig(config) {
  const explorer = cosmiconfigSync(config);
  return explorer.search(path.dirname(process.cwd()));
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
const modelConfig = Object.assign({}, schemaConfig, getConfig('genmodel'));

export { schemaConfig, prettierConfig, modelConfig };
