#!/usr/bin/env node

import { getOptions } from '../src/options.js';
import { optimize } from '../src/optimize.js';
import chalk from 'chalk';

try {
  const options = getOptions();
  await optimize(options);
} catch (error) {
  // Limpia ora/cli-progress si quedaron colgados
  if (error.code === "INVALID_FORMAT") {
    console.error(chalk.red(`\n✗ ${error.message}`));
  } else {
    console.error(chalk.red('\n✗ Error:'), error.message);
    if (process.env.DEBUG) console.error(error.stack);
  }
  process.exit(error.exitCode || 1);
}
