const chalk = require('chalk');

// TODO: give reporting options (console, html report, etc).
module.exports = function report(component, error) {
  console.log(`${chalk.blue(component)}: ${chalk.bold.red(error)}\n`); // eslint-disable-line no-console
};
