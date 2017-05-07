import { flattenChildren } from '../../util/ast-utils';

const errorMessage = 'img tags must have a meaningful alternative text via the alt prop';

function hasAlt(attr) {
  return attr === '' || attr !== undefined; // eslint-disable-line no-undefined
}

module.exports = function create(node, report) {
  const allElements = [node].concat(flattenChildren(node));
  const imgElement = allElements.find(element => element.name === 'img');

  if (!imgElement) {
    return;
  }

  if (!hasAlt(imgElement.attrs.alt)) {
    report(errorMessage);
  }
};
