const fs = require('fs');
const tmp = require('tmp');

module.exports = function writeModule(directory, contents = '') {
  return new Promise((resolve, reject) => {
    tmp.file({ postfix: '.js', dir: directory }, (tmpErr, path, fd, cleanupCallback) => {
      if (tmpErr) {
        reject(tmpErr);
      }

      fs.writeFile(path, contents, (err) => {
        if (err) {
          cleanupCallback();
          reject(err);
        }

        try {
          resolve(path);
        } catch (e) {
          throw e;
          // Just skip file if it fails.
        }
      });
    });
  });
};
