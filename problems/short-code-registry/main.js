/**
 * Build a registry mapping short codes to their full values.
 *
 * @param {string[][]} entries - Array of [code, value] pairs
 * @returns {Object} Registry object mapping codes to values
 */
function buildRegistry(entries) {
  // TODO: implement
}

/**
 * Look up a code in the registry.
 *
 * @param {Object} registry - Registry object mapping codes to values
 * @param {string} code - The short code to look up
 * @returns {string|null} The value for the code, or null if not found
 */
function lookupCode(registry, code) {
  // TODO: implement
}

module.exports = { buildRegistry, lookupCode };
