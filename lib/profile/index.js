import rv from './rv/index.js';

const profiles = {
  5: rv
};

/**
 * Prepares query depending on the mode.
 * @param {Object} query - The query object.
 * @returns {Object} The prepared query.
 */
export default function prepareQuery(query) {
  const { mode } = query;
  return profiles[mode]?.(query) || query;
}
