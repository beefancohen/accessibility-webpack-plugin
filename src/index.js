/* eslint-disable no-underscore-dangle */
require('babel-polyfill');
const rimraf = require('rimraf');
const writeModule = require('./util/tmpFile');
const rules = require('./a11y/rules');
const Parser = require('./a11y/Parser');
const Reporter = require('./a11y/Reporter');
const ModuleFactory = require('./factories/moduleFactory');

const TMP_DIR = `${__dirname}/tmp`;
const FILE_MOCK_DEPENDENCY_PATH = `${__dirname}/mocks/fileMock`;
const STYLE_MOCK_DEPENDENCY_PATH = `${__dirname}/mocks/styleMock`;
const FILE_MOCK_REGEX = /\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$/;
const STYLE_MOCK_REGEX = /\.(css|less|sass|scss)$/;

const handleDependencies = (module) => {
  // Gather dependencies that have relative paths (in-app).
  const dependencies = module.dependencies
    .filter(dependency => dependency.module)
    .map(dependency => ModuleFactory(dependency.module))
    .filter(dependency => dependency.isExternalDependency() === false && dependency.absolutePath !== module.absolutePath);

  if (dependencies.length === 0) {
    return module;
  }

  // Return module with modified source code that changes requires to point
  // to tmp files with compiled dependencies.
  try {
    return dependencies.reduce(async (newModule, dependency) => {
      // Recurse through all dependencies.
      handleDependencies(dependency);

      // Async functions return a promise.
      const modifiedModule = await newModule;
      // List of paths to temporary files that should be deleted afterwards.
      const dependencyPaths = modifiedModule.dependencyPaths || [];

      if (STYLE_MOCK_REGEX.test(dependency.absolutePath)) {
        return {
          ...modifiedModule,
          source: modifiedModule.source.replace(dependency.relativePath, STYLE_MOCK_DEPENDENCY_PATH),
        };
      } else if (FILE_MOCK_REGEX.test(dependency.absolutePath)) {
        return {
          ...modifiedModule,
          source: modifiedModule.source.replace(dependency.relativePath, FILE_MOCK_DEPENDENCY_PATH),
        };
      }

      const newDependencyPath = await writeModule(TMP_DIR, dependency.source);
      return {
        ...modifiedModule,
        source: modifiedModule.source.replace(dependency.relativePath, newDependencyPath),
        dependencyPaths: dependencyPaths.concat([newDependencyPath]),
      };
    }, module);
  } catch (e) {
    throw e;
  }
};

class AccessibilityWebpackPlugin {
  constructor(options) {
    this.options = options;
    this.createElement = options.createElement;
    this.renderMarkup = options.renderMarkup;
    this.reporter = new Reporter(this.options);
  }

  apply(compiler) {
    compiler.plugin('emit', (compilation, callback) => {
      compilation.chunks.forEach((chunk) => {
        chunk.modules.map(module => ModuleFactory(module)).filter(module => module.shouldExamine()).forEach(async (module) => {
          let path;
          let dependencyPaths = [];

          try {
            const modifiedModule = await handleDependencies(module);
            path = await writeModule(TMP_DIR, modifiedModule.source);
            dependencyPaths = dependencyPaths.concat(modifiedModule.dependencyPaths || []).concat([path]);

            // Inject component library (React, preact, etc)
            const component = require(path).default; // eslint-disable-line
            const element = this.createElement(component);
            const componentType = element.type.name;
            const markup = this.renderMarkup(element);

            // Run a11y report on markup!
            const parser = new Parser(componentType, this.reporter);
            parser.execute(rules, markup);
          } catch (e) {
            throw e;
          } finally {
            // Clean up tmp files.
            // TODO: create glob from list of paths to make this one rimraf call.
            // Not sure how safe this would be if the LCS is something outside
            // the scope of the project.
            dependencyPaths.forEach(file => rimraf(file, () => {}));
          }
        });
      });

      callback();
    });
  }
}

export default AccessibilityWebpackPlugin;
/* eslint-enable no-underscore-dangle */
