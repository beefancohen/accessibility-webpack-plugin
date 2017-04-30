const tmp = require('tmp');
const fs = require('fs');
const chalk = require('chalk');

const isReactComponent = source => source.indexOf('(_react.Component)') > -1;

class AccessibilityWebpackPlugin {
  constructor(options) {
    this.createElement = options.createElement;
    this.renderMarkup = options.renderMarkup;
  }

  apply(compiler) {
    compiler.plugin('emit', (compilation, callback) => {
      // Explore each chunk (build output):
      compilation.chunks.forEach((chunk) => {
        // Start with application specific modules
        chunk.modules
          .filter(
            module =>
              module.resource &&
              module.resource.indexOf('node_modules') === -1 &&
              module.resource.match(/\.(js|jsx)$/),
          )
          .map(module => ({
            source: module._source._value, // eslint-disable-line no-underscore-dangle
            fileName: module.resource,
          }))
          .filter(module => isReactComponent(module.source))
          .forEach((module) => {
            // Write to temporary file
            tmp.file(
              { postfix: '.js', dir: `${__dirname}/tmp` },
              (tmpErr, path, fd, cleanupCallback) => {
                if (tmpErr) throw tmpErr;

                fs.writeFile(path, module.source, (err) => {
                  if (err) throw err;

                  try {
                    const component = require(path).default; // eslint-disable-line
                    const element = this.createElement(component);
                    const markup = this.renderMarkup(element);

                    // Run a11y report on markup!
                    console.log(chalk.green(`<${component.name}>: `), markup); // eslint-disable-line
                  } catch (e) {
                    // Just skip file if it fails.
                  } finally {
                    cleanupCallback();
                  }
                });
              },
            );
          });
      });

      callback();
    });
  }
}

module.exports = AccessibilityWebpackPlugin;
