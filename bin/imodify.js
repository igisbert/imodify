#!/usr/bin/env node

import { getOptions } from '../src/options.js';
import { optimize } from '../src/optimize.js';
import chalk from 'chalk';

try {
  const options = getOptions();
  
  // Por ahora, pasamos las opciones al orquestador.
  // En el siguiente paso implementaremos la lógica real en optimize.js
  await optimize(options);
  
} catch (error) {
  console.error(chalk.red('\n✗ Error:'), error.message);
  process.exit(1);
}
