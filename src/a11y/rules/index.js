const imgHasAlt = require('./img-has-alt');

module.exports = function generateRules(options) {
  const rules = [imgHasAlt];

  return rules.map(rule => rule.bind(null, options));
};
