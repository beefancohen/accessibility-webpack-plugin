/* eslint-disable no-underscore-dangle */
require('babel-polyfill');
const tmp = require('tmp');
const fs = require('fs');
const chalk = require('chalk');
const rimraf = require('rimraf');

const TMP_DIR = `${__dirname}/tmp`;

const isReactComponent = source => source.indexOf('(_react.Component)') > -1;

const writeModule = source =>
  new Promise((resolve, reject) => {
    tmp.file({ postfix: '.js', dir: TMP_DIR }, (tmpErr, path, fd, cleanupCallback) => {
      if (tmpErr) {
        cleanupCallback();
        reject(tmpErr);
      }

      fs.writeFile(path, source, (err) => {
        if (err) {
          cleanupCallback();
          reject(err);
        }

        try {
          resolve(path);
        } catch (e) {
          throw e;
          // Just skip file if it fails.
        }
      });
    });
  });

const handleDependencies = async (module) => {
  const { dependencies: moduleDependencies = [] } = module;

  const dependencies = moduleDependencies
    .filter(
      dependency =>
        dependency.module &&
        dependency.module.resource &&
        dependency.module.resource.indexOf('node_modules') === -1,
    )
    .map(dependency => dependency.module);

  if (dependencies.length === 0) {
    return module;
  }

  let dependencyPaths = [];
  const moduleSource = await dependencies.reduce(async (source = '', dependency) => {
    // Recurse through all dependencies.
    await handleDependencies(dependency);

    const pathToReplace = dependency.rawRequest;
    const newSourcePath = await writeModule(dependency._source._value);
    dependencyPaths = dependencyPaths.concat([newSourcePath]);
    return source.replace(pathToReplace, newSourcePath);
  }, module._source._value);

  return {
    ...module,
    modifiedSource: moduleSource,
    dependencyPaths,
  };
};

class AccessibilityWebpackPlugin {
  constructor(options) {
    this.createElement = options.createElement;
    this.renderMarkup = options.renderMarkup;
  }

  apply(compiler) {
    compiler.plugin('emit', (compilation, callback) => {
      compilation.chunks.forEach((chunk) => {
        chunk.modules
          .filter(
            module =>
              module.resource &&
              module.resource.indexOf('node_modules') === -1 &&
              module.resource.match(/\.(js|jsx)$/),
          )
          .filter(module => isReactComponent(module._source._value))
          .forEach(async (module) => {
            // const fileName = module.resource;
            const { modifiedSource, dependencyPaths = [] } = await handleDependencies(module);
            const source = modifiedSource || module._source._value;

            writeModule(source).then((path) => {
              const component = require(path).default; // eslint-disable-line
              const element = this.createElement(component);
              const markup = this.renderMarkup(element);

              // Run a11y report on markup!
              console.log(chalk.green(`<${component.name}>: `), markup, '\n'); // eslint-disable-line

              // Clean up tmp files.
              dependencyPaths.concat([path]).forEach(file => rimraf(file, () => {}));
            });
          });
      });

      callback();
    });
  }
}

module.exports = AccessibilityWebpackPlugin;
/* eslint-enable no-underscore-dangle */
