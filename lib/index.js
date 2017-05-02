'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* eslint-disable no-underscore-dangle */
require('core-js/modules/es6.typed.array-buffer');

require('core-js/modules/es6.typed.int8-array');

require('core-js/modules/es6.typed.uint8-array');

require('core-js/modules/es6.typed.uint8-clamped-array');

require('core-js/modules/es6.typed.int16-array');

require('core-js/modules/es6.typed.uint16-array');

require('core-js/modules/es6.typed.int32-array');

require('core-js/modules/es6.typed.uint32-array');

require('core-js/modules/es6.typed.float32-array');

require('core-js/modules/es6.typed.float64-array');

require('core-js/modules/es6.map');

require('core-js/modules/es6.set');

require('core-js/modules/es6.weak-map');

require('core-js/modules/es6.weak-set');

require('core-js/modules/es6.reflect.apply');

require('core-js/modules/es6.reflect.construct');

require('core-js/modules/es6.reflect.define-property');

require('core-js/modules/es6.reflect.delete-property');

require('core-js/modules/es6.reflect.get');

require('core-js/modules/es6.reflect.get-own-property-descriptor');

require('core-js/modules/es6.reflect.get-prototype-of');

require('core-js/modules/es6.reflect.has');

require('core-js/modules/es6.reflect.is-extensible');

require('core-js/modules/es6.reflect.own-keys');

require('core-js/modules/es6.reflect.prevent-extensions');

require('core-js/modules/es6.reflect.set');

require('core-js/modules/es6.reflect.set-prototype-of');

require('core-js/modules/es6.promise');

require('core-js/modules/es6.symbol');

require('core-js/modules/es6.function.name');

require('core-js/modules/es6.regexp.flags');

require('core-js/modules/es6.regexp.match');

require('core-js/modules/es6.regexp.replace');

require('core-js/modules/es6.regexp.split');

require('core-js/modules/es6.regexp.search');

require('core-js/modules/es6.array.from');

require('core-js/modules/es7.array.includes');

require('core-js/modules/es7.object.values');

require('core-js/modules/es7.object.entries');

require('core-js/modules/es7.object.get-own-property-descriptors');

require('core-js/modules/es7.string.pad-start');

require('core-js/modules/es7.string.pad-end');

var chalk = require('chalk');
var rimraf = require('rimraf');
var writeModule = require('./util/tmpFile');

var TMP_DIR = `${__dirname}/tmp`;
var FILE_MOCK_DEPENDENCY_PATH = `${__dirname}/mocks/fileMock`;
var STYLE_MOCK_DEPENDENCY_PATH = `${__dirname}/mocks/styleMock`;
var JS_FILE_REGEX = /\.(js|jsx)$/;
var FILE_MOCK_REGEX = /\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$/;
var STYLE_MOCK_REGEX = /\.(css|less|sass)$/;

var isReactComponent = function isReactComponent(source) {
  return source.indexOf('(_react.Component)') > -1;
};

var isExternalDependency = function isExternalDependency(module) {
  return module && module.resource && module.resource.indexOf('node_modules') > -1;
};

var getSourceCode = function getSourceCode(module) {
  return module._source && module._source._value;
};

var handleDependencies = function handleDependencies(module) {
  var _module$dependencies = module.dependencies,
      moduleDependencies = _module$dependencies === undefined ? [] : _module$dependencies;

  // Gather dependencies that have relative paths (in-app).

  var dependencies = moduleDependencies.map(function (dependency) {
    return dependency.module;
  }).filter(function (dependency) {
    return isExternalDependency(dependency) === false && dependency.resource !== module.resource;
  });

  if (dependencies.length === 0) {
    return module;
  }

  // Return module with modified source code that changes requires to point
  // to tmp files with compiled dependencies.
  try {
    var revisedModule = dependencies.reduce(async function () {
      var m = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var dependency = arguments[1];

      // Recurse through all dependencies.
      handleDependencies(dependency);

      // Async functions return a promise.
      var modifiedModule = await m;
      var pathToReplaceInSource = dependency.rawRequest;
      var source = modifiedModule.modifiedSource || getSourceCode(modifiedModule) || '';
      var dependencyPaths = modifiedModule.dependencyPaths || [];

      if (STYLE_MOCK_REGEX.test(dependency.userRequest)) {
        return Object.assign({}, modifiedModule, {
          modifiedSource: source.replace(pathToReplaceInSource, STYLE_MOCK_DEPENDENCY_PATH)
        });
      } else if (FILE_MOCK_REGEX.test(dependency.userRequest)) {
        return Object.assign({}, modifiedModule, {
          modifiedSource: source.replace(pathToReplaceInSource, FILE_MOCK_DEPENDENCY_PATH)
        });
      }

      var newDependencyPath = await writeModule(TMP_DIR, getSourceCode(dependency));
      return Object.assign({}, modifiedModule, {
        modifiedSource: source.replace(pathToReplaceInSource, newDependencyPath),
        // Paths to clean up afterwards.
        dependencyPaths: dependencyPaths.concat([newDependencyPath])
      });
    }, module);

    return revisedModule;
  } catch (e) {
    throw e;
  }
};

var AccessibilityWebpackPlugin = function () {
  function AccessibilityWebpackPlugin(options) {
    _classCallCheck(this, AccessibilityWebpackPlugin);

    this.createElement = options.createElement;
    this.renderMarkup = options.renderMarkup;
  }

  _createClass(AccessibilityWebpackPlugin, [{
    key: 'apply',
    value: function apply(compiler) {
      var _this = this;

      compiler.plugin('emit', function (compilation, callback) {
        compilation.chunks.forEach(function (chunk) {
          chunk.modules.filter(function (module) {
            return isExternalDependency(module) === false && JS_FILE_REGEX.test(module.resource);
          }).filter(function (module) {
            return isReactComponent(getSourceCode(module));
          }).forEach(async function (module) {
            var dependencyPaths = [];
            var path = void 0;

            try {
              var modifiedModule = await handleDependencies(module);
              var source = modifiedModule.modifiedSource || getSourceCode(module) || '';
              dependencyPaths = dependencyPaths.concat(modifiedModule.dependencyPaths || []);

              path = await writeModule(TMP_DIR, source);

              // Inject component library (React, preact, etc)
              var component = require(path).default; // eslint-disable-line
              var element = _this.createElement(component);
              var markup = _this.renderMarkup(element);

              // Run a11y report on markup!
              console.log(chalk.green(`<${component.name}>: `), markup, '\n'); // eslint-disable-line
            } catch (e) {
              throw e;
            } finally {
              // Clean up tmp files.
              // TODO: create glob from list of paths to make this one rimraf call.
              // Not sure how safe this would be if the LCS is something outside
              // the scope of the project.
              dependencyPaths.concat([path]).forEach(function (file) {
                return rimraf(file, function () {});
              });
            }
          });
        });

        callback();
      });
    }
  }]);

  return AccessibilityWebpackPlugin;
}();

exports.default = AccessibilityWebpackPlugin;
/* eslint-enable no-underscore-dangle */
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJjaGFsayIsInJlcXVpcmUiLCJyaW1yYWYiLCJ3cml0ZU1vZHVsZSIsIlRNUF9ESVIiLCJfX2Rpcm5hbWUiLCJGSUxFX01PQ0tfREVQRU5ERU5DWV9QQVRIIiwiU1RZTEVfTU9DS19ERVBFTkRFTkNZX1BBVEgiLCJKU19GSUxFX1JFR0VYIiwiRklMRV9NT0NLX1JFR0VYIiwiU1RZTEVfTU9DS19SRUdFWCIsImlzUmVhY3RDb21wb25lbnQiLCJzb3VyY2UiLCJpbmRleE9mIiwiaXNFeHRlcm5hbERlcGVuZGVuY3kiLCJtb2R1bGUiLCJyZXNvdXJjZSIsImdldFNvdXJjZUNvZGUiLCJfc291cmNlIiwiX3ZhbHVlIiwiaGFuZGxlRGVwZW5kZW5jaWVzIiwiZGVwZW5kZW5jaWVzIiwibW9kdWxlRGVwZW5kZW5jaWVzIiwibWFwIiwiZGVwZW5kZW5jeSIsImZpbHRlciIsImxlbmd0aCIsInJldmlzZWRNb2R1bGUiLCJyZWR1Y2UiLCJtIiwibW9kaWZpZWRNb2R1bGUiLCJwYXRoVG9SZXBsYWNlSW5Tb3VyY2UiLCJyYXdSZXF1ZXN0IiwibW9kaWZpZWRTb3VyY2UiLCJkZXBlbmRlbmN5UGF0aHMiLCJ0ZXN0IiwidXNlclJlcXVlc3QiLCJyZXBsYWNlIiwibmV3RGVwZW5kZW5jeVBhdGgiLCJjb25jYXQiLCJlIiwiQWNjZXNzaWJpbGl0eVdlYnBhY2tQbHVnaW4iLCJvcHRpb25zIiwiY3JlYXRlRWxlbWVudCIsInJlbmRlck1hcmt1cCIsImNvbXBpbGVyIiwicGx1Z2luIiwiY29tcGlsYXRpb24iLCJjYWxsYmFjayIsImNodW5rcyIsImZvckVhY2giLCJjaHVuayIsIm1vZHVsZXMiLCJwYXRoIiwiY29tcG9uZW50IiwiZGVmYXVsdCIsImVsZW1lbnQiLCJtYXJrdXAiLCJjb25zb2xlIiwibG9nIiwiZ3JlZW4iLCJuYW1lIiwiZmlsZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7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LEVBQXFCUSxNQUFyQixDQUFiOztBQUVBO0FBQ0Esa0JBQU0wQyxZQUFZckQsUUFBUW9ELElBQVIsRUFBY0UsT0FBaEMsQ0FSRSxDQVF1QztBQUN6QyxrQkFBTUMsVUFBVSxNQUFLYixhQUFMLENBQW1CVyxTQUFuQixDQUFoQjtBQUNBLGtCQUFNRyxTQUFTLE1BQUtiLFlBQUwsQ0FBa0JZLE9BQWxCLENBQWY7O0FBRUE7QUFDQUUsc0JBQVFDLEdBQVIsQ0FBWTNELE1BQU00RCxLQUFOLENBQWEsSUFBR04sVUFBVU8sSUFBSyxLQUEvQixDQUFaLEVBQWtESixNQUFsRCxFQUEwRCxJQUExRCxFQWJFLENBYStEO0FBQ2xFLGFBZEQsQ0FjRSxPQUFPakIsQ0FBUCxFQUFVO0FBQ1Ysb0JBQU1BLENBQU47QUFDRCxhQWhCRCxTQWdCVTtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0FOLDhCQUFnQkssTUFBaEIsQ0FBdUIsQ0FBQ2MsSUFBRCxDQUF2QixFQUErQkgsT0FBL0IsQ0FBdUM7QUFBQSx1QkFBUWhELE9BQU80RCxJQUFQLEVBQWEsWUFBTSxDQUFFLENBQXJCLENBQVI7QUFBQSxlQUF2QztBQUNEO0FBQ0YsV0E5Qkg7QUErQkQsU0FoQ0Q7O0FBa0NBZDtBQUNELE9BcENEO0FBcUNEOzs7Ozs7a0JBR1lQLDBCO0FBQ2YiLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBuby11bmRlcnNjb3JlLWRhbmdsZSAqL1xucmVxdWlyZSgnYmFiZWwtcG9seWZpbGwnKTtcbmNvbnN0IGNoYWxrID0gcmVxdWlyZSgnY2hhbGsnKTtcbmNvbnN0IHJpbXJhZiA9IHJlcXVpcmUoJ3JpbXJhZicpO1xuY29uc3Qgd3JpdGVNb2R1bGUgPSByZXF1aXJlKCcuL3V0aWwvdG1wRmlsZScpO1xuXG5jb25zdCBUTVBfRElSID0gYCR7X19kaXJuYW1lfS90bXBgO1xuY29uc3QgRklMRV9NT0NLX0RFUEVOREVOQ1lfUEFUSCA9IGAke19fZGlybmFtZX0vbW9ja3MvZmlsZU1vY2tgO1xuY29uc3QgU1RZTEVfTU9DS19ERVBFTkRFTkNZX1BBVEggPSBgJHtfX2Rpcm5hbWV9L21vY2tzL3N0eWxlTW9ja2A7XG5jb25zdCBKU19GSUxFX1JFR0VYID0gL1xcLihqc3xqc3gpJC87XG5jb25zdCBGSUxFX01PQ0tfUkVHRVggPSAvXFwuKGpwZ3xqcGVnfHBuZ3xnaWZ8ZW90fG90Znx3ZWJwfHN2Z3x0dGZ8d29mZnx3b2ZmMnxtcDR8d2VibXx3YXZ8bXAzfG00YXxhYWN8b2dhKSQvO1xuY29uc3QgU1RZTEVfTU9DS19SRUdFWCA9IC9cXC4oY3NzfGxlc3N8c2FzcykkLztcblxuY29uc3QgaXNSZWFjdENvbXBvbmVudCA9IHNvdXJjZSA9PiBzb3VyY2UuaW5kZXhPZignKF9yZWFjdC5Db21wb25lbnQpJykgPiAtMTtcblxuY29uc3QgaXNFeHRlcm5hbERlcGVuZGVuY3kgPSBtb2R1bGUgPT4gbW9kdWxlICYmIG1vZHVsZS5yZXNvdXJjZSAmJiBtb2R1bGUucmVzb3VyY2UuaW5kZXhPZignbm9kZV9tb2R1bGVzJykgPiAtMTtcblxuY29uc3QgZ2V0U291cmNlQ29kZSA9IG1vZHVsZSA9PiBtb2R1bGUuX3NvdXJjZSAmJiBtb2R1bGUuX3NvdXJjZS5fdmFsdWU7XG5cbmNvbnN0IGhhbmRsZURlcGVuZGVuY2llcyA9IChtb2R1bGUpID0+IHtcbiAgY29uc3QgeyBkZXBlbmRlbmNpZXM6IG1vZHVsZURlcGVuZGVuY2llcyA9IFtdIH0gPSBtb2R1bGU7XG5cbiAgLy8gR2F0aGVyIGRlcGVuZGVuY2llcyB0aGF0IGhhdmUgcmVsYXRpdmUgcGF0aHMgKGluLWFwcCkuXG4gIGNvbnN0IGRlcGVuZGVuY2llcyA9IG1vZHVsZURlcGVuZGVuY2llc1xuICAgIC5tYXAoZGVwZW5kZW5jeSA9PiBkZXBlbmRlbmN5Lm1vZHVsZSlcbiAgICAuZmlsdGVyKGRlcGVuZGVuY3kgPT4gaXNFeHRlcm5hbERlcGVuZGVuY3koZGVwZW5kZW5jeSkgPT09IGZhbHNlICYmIGRlcGVuZGVuY3kucmVzb3VyY2UgIT09IG1vZHVsZS5yZXNvdXJjZSk7XG5cbiAgaWYgKGRlcGVuZGVuY2llcy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbW9kdWxlO1xuICB9XG5cbiAgLy8gUmV0dXJuIG1vZHVsZSB3aXRoIG1vZGlmaWVkIHNvdXJjZSBjb2RlIHRoYXQgY2hhbmdlcyByZXF1aXJlcyB0byBwb2ludFxuICAvLyB0byB0bXAgZmlsZXMgd2l0aCBjb21waWxlZCBkZXBlbmRlbmNpZXMuXG4gIHRyeSB7XG4gICAgY29uc3QgcmV2aXNlZE1vZHVsZSA9IGRlcGVuZGVuY2llcy5yZWR1Y2UoYXN5bmMgKG0gPSB7fSwgZGVwZW5kZW5jeSkgPT4ge1xuICAgICAgLy8gUmVjdXJzZSB0aHJvdWdoIGFsbCBkZXBlbmRlbmNpZXMuXG4gICAgICBoYW5kbGVEZXBlbmRlbmNpZXMoZGVwZW5kZW5jeSk7XG5cbiAgICAgIC8vIEFzeW5jIGZ1bmN0aW9ucyByZXR1cm4gYSBwcm9taXNlLlxuICAgICAgY29uc3QgbW9kaWZpZWRNb2R1bGUgPSBhd2FpdCBtO1xuICAgICAgY29uc3QgcGF0aFRvUmVwbGFjZUluU291cmNlID0gZGVwZW5kZW5jeS5yYXdSZXF1ZXN0O1xuICAgICAgY29uc3Qgc291cmNlID0gbW9kaWZpZWRNb2R1bGUubW9kaWZpZWRTb3VyY2UgfHwgZ2V0U291cmNlQ29kZShtb2RpZmllZE1vZHVsZSkgfHwgJyc7XG4gICAgICBjb25zdCBkZXBlbmRlbmN5UGF0aHMgPSBtb2RpZmllZE1vZHVsZS5kZXBlbmRlbmN5UGF0aHMgfHwgW107XG5cbiAgICAgIGlmIChTVFlMRV9NT0NLX1JFR0VYLnRlc3QoZGVwZW5kZW5jeS51c2VyUmVxdWVzdCkpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAuLi5tb2RpZmllZE1vZHVsZSxcbiAgICAgICAgICBtb2RpZmllZFNvdXJjZTogc291cmNlLnJlcGxhY2UocGF0aFRvUmVwbGFjZUluU291cmNlLCBTVFlMRV9NT0NLX0RFUEVOREVOQ1lfUEFUSCksXG4gICAgICAgIH07XG4gICAgICB9IGVsc2UgaWYgKEZJTEVfTU9DS19SRUdFWC50ZXN0KGRlcGVuZGVuY3kudXNlclJlcXVlc3QpKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgLi4ubW9kaWZpZWRNb2R1bGUsXG4gICAgICAgICAgbW9kaWZpZWRTb3VyY2U6IHNvdXJjZS5yZXBsYWNlKHBhdGhUb1JlcGxhY2VJblNvdXJjZSwgRklMRV9NT0NLX0RFUEVOREVOQ1lfUEFUSCksXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IG5ld0RlcGVuZGVuY3lQYXRoID0gYXdhaXQgd3JpdGVNb2R1bGUoVE1QX0RJUiwgZ2V0U291cmNlQ29kZShkZXBlbmRlbmN5KSk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICAuLi5tb2RpZmllZE1vZHVsZSxcbiAgICAgICAgbW9kaWZpZWRTb3VyY2U6IHNvdXJjZS5yZXBsYWNlKHBhdGhUb1JlcGxhY2VJblNvdXJjZSwgbmV3RGVwZW5kZW5jeVBhdGgpLFxuICAgICAgICAvLyBQYXRocyB0byBjbGVhbiB1cCBhZnRlcndhcmRzLlxuICAgICAgICBkZXBlbmRlbmN5UGF0aHM6IGRlcGVuZGVuY3lQYXRocy5jb25jYXQoW25ld0RlcGVuZGVuY3lQYXRoXSksXG4gICAgICB9O1xuICAgIH0sIG1vZHVsZSk7XG5cbiAgICByZXR1cm4gcmV2aXNlZE1vZHVsZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHRocm93IGU7XG4gIH1cbn07XG5cbmNsYXNzIEFjY2Vzc2liaWxpdHlXZWJwYWNrUGx1Z2luIHtcbiAgY29uc3RydWN0b3Iob3B0aW9ucykge1xuICAgIHRoaXMuY3JlYXRlRWxlbWVudCA9IG9wdGlvbnMuY3JlYXRlRWxlbWVudDtcbiAgICB0aGlzLnJlbmRlck1hcmt1cCA9IG9wdGlvbnMucmVuZGVyTWFya3VwO1xuICB9XG5cbiAgYXBwbHkoY29tcGlsZXIpIHtcbiAgICBjb21waWxlci5wbHVnaW4oJ2VtaXQnLCAoY29tcGlsYXRpb24sIGNhbGxiYWNrKSA9PiB7XG4gICAgICBjb21waWxhdGlvbi5jaHVua3MuZm9yRWFjaCgoY2h1bmspID0+IHtcbiAgICAgICAgY2h1bmsubW9kdWxlc1xuICAgICAgICAgIC5maWx0ZXIobW9kdWxlID0+IGlzRXh0ZXJuYWxEZXBlbmRlbmN5KG1vZHVsZSkgPT09IGZhbHNlICYmIEpTX0ZJTEVfUkVHRVgudGVzdChtb2R1bGUucmVzb3VyY2UpKVxuICAgICAgICAgIC5maWx0ZXIobW9kdWxlID0+IGlzUmVhY3RDb21wb25lbnQoZ2V0U291cmNlQ29kZShtb2R1bGUpKSlcbiAgICAgICAgICAuZm9yRWFjaChhc3luYyAobW9kdWxlKSA9PiB7XG4gICAgICAgICAgICBsZXQgZGVwZW5kZW5jeVBhdGhzID0gW107XG4gICAgICAgICAgICBsZXQgcGF0aDtcblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgY29uc3QgbW9kaWZpZWRNb2R1bGUgPSBhd2FpdCBoYW5kbGVEZXBlbmRlbmNpZXMobW9kdWxlKTtcbiAgICAgICAgICAgICAgY29uc3Qgc291cmNlID0gbW9kaWZpZWRNb2R1bGUubW9kaWZpZWRTb3VyY2UgfHwgZ2V0U291cmNlQ29kZShtb2R1bGUpIHx8ICcnO1xuICAgICAgICAgICAgICBkZXBlbmRlbmN5UGF0aHMgPSBkZXBlbmRlbmN5UGF0aHMuY29uY2F0KG1vZGlmaWVkTW9kdWxlLmRlcGVuZGVuY3lQYXRocyB8fCBbXSk7XG5cbiAgICAgICAgICAgICAgcGF0aCA9IGF3YWl0IHdyaXRlTW9kdWxlKFRNUF9ESVIsIHNvdXJjZSk7XG5cbiAgICAgICAgICAgICAgLy8gSW5qZWN0IGNvbXBvbmVudCBsaWJyYXJ5IChSZWFjdCwgcHJlYWN0LCBldGMpXG4gICAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudCA9IHJlcXVpcmUocGF0aCkuZGVmYXVsdDsgLy8gZXNsaW50LWRpc2FibGUtbGluZVxuICAgICAgICAgICAgICBjb25zdCBlbGVtZW50ID0gdGhpcy5jcmVhdGVFbGVtZW50KGNvbXBvbmVudCk7XG4gICAgICAgICAgICAgIGNvbnN0IG1hcmt1cCA9IHRoaXMucmVuZGVyTWFya3VwKGVsZW1lbnQpO1xuXG4gICAgICAgICAgICAgIC8vIFJ1biBhMTF5IHJlcG9ydCBvbiBtYXJrdXAhXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKGNoYWxrLmdyZWVuKGA8JHtjb21wb25lbnQubmFtZX0+OiBgKSwgbWFya3VwLCAnXFxuJyk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAgIC8vIENsZWFuIHVwIHRtcCBmaWxlcy5cbiAgICAgICAgICAgICAgLy8gVE9ETzogY3JlYXRlIGdsb2IgZnJvbSBsaXN0IG9mIHBhdGhzIHRvIG1ha2UgdGhpcyBvbmUgcmltcmFmIGNhbGwuXG4gICAgICAgICAgICAgIC8vIE5vdCBzdXJlIGhvdyBzYWZlIHRoaXMgd291bGQgYmUgaWYgdGhlIExDUyBpcyBzb21ldGhpbmcgb3V0c2lkZVxuICAgICAgICAgICAgICAvLyB0aGUgc2NvcGUgb2YgdGhlIHByb2plY3QuXG4gICAgICAgICAgICAgIGRlcGVuZGVuY3lQYXRocy5jb25jYXQoW3BhdGhdKS5mb3JFYWNoKGZpbGUgPT4gcmltcmFmKGZpbGUsICgpID0+IHt9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgY2FsbGJhY2soKTtcbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBBY2Nlc3NpYmlsaXR5V2VicGFja1BsdWdpbjtcbi8qIGVzbGludC1lbmFibGUgbm8tdW5kZXJzY29yZS1kYW5nbGUgKi9cbiJdfQ==