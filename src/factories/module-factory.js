const Module = require('../Module');

// eslint-disable-next-line no-underscore-dangle
const getSourceCode = module => module._source && module._source._value;

module.exports = function apply(module) {
  return new Module(getSourceCode(module), module.rawRequest, module.resource, module.dependencies);
};
