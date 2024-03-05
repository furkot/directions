const profiles = {
  5: require('./rv')
};

module.exports = prepareQuery;

/**
 * Prepares query depending on the mode.
 * @param {Object} query - The query object.
 * @returns {Object} The prepared query.
 */
function prepareQuery(query) {
  const { mode } = query;
  return profiles[mode]?.(query) || query;
}
