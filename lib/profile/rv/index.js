const { passengerCar, defaultRV } = require('./dimensions');
const passengerCarEntries = Object.entries(passengerCar);

module.exports = prepareQuery;

/**
 * Treat RV as passenger car when it doesn't carry hazmat and all its dimensions
 * that are present fall within the passenger car limits.
 * @param {Object} vehicle - The vehicle object.
 * @returns {boolean} Whether to treat RV as passenger car.
 */
function isPassengerCar(vehicle) {
  return !vehicle.hazmat && passengerCarEntries.every(([k, v]) => vehicle[k] <= v);
}

/**
 * Treat RV as non commercial truck when it doesn't carry hazmat and its
 * weight and length are below truck limits.
 * @param {Object} vehicle - The vehicle object.
 * @returns {boolean} Whether to treat RV as non commercial truck.
 */
function isNonCommercialTruck(vehicle) {
  return !vehicle.hazmat && vehicle.length < defaultRV.length && vehicle.weight < defaultRV.weight;
}

/**
 * Prepares vehicle size for the query.
 * @param {Object} query - The query object.
 * @returns {Object} The prepared query with vehicle size.
 */
function prepareVehicle(vehicle) {
  if (!vehicle) {
    // treat as a standard truck
    return {
      vehicle: defaultRV
    };
  }
  if (isPassengerCar(vehicle)) {
    // treat as a regular passenger car
    return {
      mode: 0
    };
  }
  vehicle = Object.assign({}, defaultRV, vehicle);
  let proposedMode;
  if (isNonCommercialTruck(vehicle)) {
    // treat as a passenger car if at least height and width can be enforced
    proposedMode = 0;
  }
  return {
    proposedMode,
    vehicle
  };
}

/**
 * Prepares query.
 * @param {Object} query - The query object.
 * @returns {Object} The prepared query.
 */
function prepareQuery(query) {
  const { mode: initialMode, vehicle: initialVehicle } = query;
  return Object.assign(
    {
      initialMode,
      initialVehicle
    },
    query,
    prepareVehicle(query.vehicle)
  );
}
