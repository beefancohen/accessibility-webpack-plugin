/* eslint-disable no-underscore-dangle */
require('babel-polyfill');
const tmp = require('tmp');
const fs = require('fs');
const chalk = require('chalk');
// const rimraf = require('rimraf');

const TMP_DIR = `${__dirname}/tmp`;
const FILE_MOCK_DEPENDENCY_PATH = `${__dirname}/fileMock`;
const STYLE_MOCK_DEPENDENCY_PATH = `${__dirname}/styleMock`;
const JS_FILE_REGEX = /\.(js|jsx)$/;
const FILE_MOCK_REGEX = /\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$/;
const STYLE_MOCK_REGEX = /\.(css|less|sass)$/;

const isReactComponent = source => source.indexOf('(_react.Component)') > -1;

const isExternalDependency = module =>
  module && module.resource && module.resource.indexOf('node_modules') > -1;

const getSourceCode = module => module._source._value;

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
  try {
    const { dependencies: moduleDependencies = [] } = module;

    const dependencies = moduleDependencies
      .map(dependency => dependency.module)
      .filter(dependency => isExternalDependency(dependency) === false);

    if (dependencies.length === 0) {
      return module;
    }

    return await dependencies.reduce(async (modifiedModule = {}, dependency) => {
      // Recurse through all dependencies if it is a JS file.
      await handleDependencies(dependency);

      const pathToReplaceInSource = dependency.rawRequest;
      const source = modifiedModule.modifiedSource || getSourceCode(modifiedModule);
      const dependencyPaths = modifiedModule.dependencyPaths || [];

      if (STYLE_MOCK_REGEX.test(dependency.userRequest)) {
        return {
          ...module,
          modifiedSource: source.replace(pathToReplaceInSource, STYLE_MOCK_DEPENDENCY_PATH),
        };
      } else if (FILE_MOCK_REGEX.test(dependency.userRequest)) {
        return {
          ...module,
          modifiedSource: source.replace(pathToReplaceInSource, FILE_MOCK_DEPENDENCY_PATH),
        };
      }

      const newSourcePath = await writeModule(getSourceCode(dependency));
      return {
        ...module,
        modifiedSource: source.replace(pathToReplaceInSource, newSourcePath),
        dependencyPaths: dependencyPaths.concat([newSourcePath]),
      };
    }, module);
  } catch (e) {
    throw e;
  }
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
            module => isExternalDependency(module) === false && JS_FILE_REGEX.test(module.resource),
          )
          .filter(module => isReactComponent(getSourceCode(module)))
          .forEach(async (module) => {
            try {
              const { modifiedSource } = await handleDependencies(module);
              const source = modifiedSource || getSourceCode(module);

              writeModule(source)
                .then((path) => {
                  const component = require(path).default; // eslint-disable-line
                  const element = this.createElement(component);
                  const markup = this.renderMarkup(element);

                  // Run a11y report on markup!
                  console.log(chalk.green(`<${component.name}>: `), markup, '\n'); // eslint-disable-line

                  // Clean up tmp files.
                  // TODO: create glob from list of paths to make this one rimraf call.
                  // dependencyPaths.concat([path]).forEach(file => rimraf(file, () => {}));
                })
                .catch((e) => {
                  console.log({ e });
                  throw e;
                });
            } catch (e) {
              throw e;
            }
          });
      });

      callback();
    });
  }
}

module.exports = AccessibilityWebpackPlugin;
/* eslint-enable no-underscore-dangle */
