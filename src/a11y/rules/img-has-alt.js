const errorMessage = 'img tags must have a meaningful alternative text via the alt prop';

module.exports = function create(component, reporter) {
  return {
    onopentag(name, attribs = {}) {
      // eslint-disable-next-line no-undefined
      if (name === 'img' && attribs.alt === undefined) {
        reporter.report({ component, error: errorMessage });
      }
    },
  };
};
