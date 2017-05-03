const chalk = require('chalk');

class Reporter {
  constructor(options = {}) {
    this.options = options;
  }

  // TODO: set options for reporting (i.e. console, html, silent)
  report({ component, error }) {
    if (this.options.silent) {
      return;
    }

    console.log(`\n<${chalk.blue(component)}>: ${chalk.bold.red(error)}`); // eslint-disable-line no-console
  }
}

module.exports = Reporter;
