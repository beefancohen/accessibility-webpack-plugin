/* eslint-disable no-underscore-dangle */
require('babel-polyfill');
const rimraf = require('rimraf');
const shhh = require('shhh');
const writeModule = require('./util/tmp-file');
const rules = require('./a11y/rules');
const Parser = require('./a11y/Parser');
const Reporter = require('./a11y/Reporter');
const TestRunner = require('./a11y/Runner');
const ModuleFactory = require('./factories/module-factory');

const TMP_DIR = `${__dirname}/tmp`;
const FILE_MOCK_DEPENDENCY_PATH = `${__dirname}/mocks/file-mock`;
const STYLE_MOCK_DEPENDENCY_PATH = `${__dirname}/mocks/style-mock`;
const FILE_MOCK_REGEX = /\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$/;
const STYLE_MOCK_REGEX = /\.(css|less|sass|scss)$/;

/**
 * For each module we are examining, we will need to handle its dependencies accordingly.
 * Since the module's source code may require a file with a relative path, we need to
 * create a temporary file with the dependency's source code and replace the module's
 * source to point to that new temporary file. This will recurse through all dependencies
 * that aren't in node_modules, since we can access node_modules with normal dependency resolution.
 */
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
    this.parser = Parser;
  }

  render(path) {
    // Quiet the console since React can be noisy in DEV mode.
    shhh.enable();
    const component = require(path).default; // eslint-disable-line
    const element = this.createElement(component);
    const markup = this.renderMarkup(element);
    shhh.disable();

    const componentName = element.type.name;
    return {
      [componentName]: markup,
    };
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

            const components = this.render(path);

            // Run a11y report on markup!
            Object.keys(components).forEach((component) => {
              const markup = components[component];
              const runner = new TestRunner({ component, reporter: this.reporter, parser: this.parser, rules });
              runner.run(markup);
            });
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
