module.exports = function create(options, component) {
  const errorMessage = 'img tags must have a meaningful alternative text via the alt prop';

  return {
    onopentag(name, attribs = {}) {
      // eslint-disable-next-line no-undefined
      if (name === 'img' && attribs.alt === undefined) {
        options.report(component, errorMessage);
      }
    },
  };
};
