/* eslint-disable no-underscore-dangle */
require('babel-polyfill');
const writeModule = require('./util/tmpFile');
const chalk = require('chalk');
const rimraf = require('rimraf');

const TMP_DIR = `${__dirname}/tmp`;
const FILE_MOCK_DEPENDENCY_PATH = `${__dirname}/mocks/fileMock`;
const STYLE_MOCK_DEPENDENCY_PATH = `${__dirname}/mocks/styleMock`;
const JS_FILE_REGEX = /\.(js|jsx)$/;
const FILE_MOCK_REGEX = /\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$/;
const STYLE_MOCK_REGEX = /\.(css|less|sass)$/;

const isReactComponent = source => source.indexOf('(_react.Component)') > -1;

const isExternalDependency = module =>
  module && module.resource && module.resource.indexOf('node_modules') > -1;

const getSourceCode = module => module._source && module._source._value;

const handleDependencies = (module) => {
  const { dependencies: moduleDependencies = [] } = module;

  // Gather dependencies that have relative paths (in-app).
  const dependencies = moduleDependencies
    .map(dependency => dependency.module)
    .filter(
      dependency =>
        isExternalDependency(dependency) === false && dependency.resource !== module.resource,
    );

  if (dependencies.length === 0) {
    return module;
  }

  // Return module with modified source code that changes requires to point
  // to tmp files with compiled dependencies.
  try {
    const revisedModule = dependencies.reduce(async (m = {}, dependency) => {
      // Recurse through all dependencies.
      handleDependencies(dependency);

      // Async functions return a promise.
      const modifiedModule = await m;
      const pathToReplaceInSource = dependency.rawRequest;
      const source = modifiedModule.modifiedSource || getSourceCode(modifiedModule) || '';
      const dependencyPaths = modifiedModule.dependencyPaths || [];

      if (STYLE_MOCK_REGEX.test(dependency.userRequest)) {
        return {
          ...modifiedModule,
          modifiedSource: source.replace(pathToReplaceInSource, STYLE_MOCK_DEPENDENCY_PATH),
        };
      } else if (FILE_MOCK_REGEX.test(dependency.userRequest)) {
        return {
          ...modifiedModule,
          modifiedSource: source.replace(pathToReplaceInSource, FILE_MOCK_DEPENDENCY_PATH),
        };
      }

      const newDependencyPath = await writeModule(TMP_DIR, getSourceCode(dependency));
      return {
        ...modifiedModule,
        modifiedSource: source.replace(pathToReplaceInSource, newDependencyPath),
        // Paths to clean up afterwards.
        dependencyPaths: dependencyPaths.concat([newDependencyPath]),
      };
    }, module);

    return revisedModule;
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
              const modifiedModule = await handleDependencies(module);
              const source = modifiedModule.modifiedSource || getSourceCode(module) || '';
              var dependencyPaths = modifiedModule.dependencyPaths || [];

              var path = await writeModule(TMP_DIR, source);

              // Inject component library (React, preact, etc)
              const component = require(path).default; // eslint-disable-line
              const element = this.createElement(component);
              const markup = this.renderMarkup(element);

              // Run a11y report on markup!
              console.log(chalk.green(`<${component.name}>: `), markup, '\n');
            } catch (e) {
              throw e;
            } finally {
              // Clean up tmp files.
              // TODO: create glob from list of paths to make this one rimraf call.
              // Not sure how safe this would be if the LCS is something outside the scope of the project.
              dependencyPaths.concat([path]).forEach(file => rimraf(file, () => {}));
            }
          });
      });

      callback();
    });
  }
}

module.exports = AccessibilityWebpackPlugin;
/* eslint-enable no-underscore-dangle */
