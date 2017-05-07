function flattenChildren(node) {
  const { children = [] } = node;

  return children.reduce((elements, child) => {
    const grandchildren = flattenChildren(child);
    return elements.concat(grandchildren);
  }, children);
}

module.exports = {
  flattenChildren,
};
