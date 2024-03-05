/**
 * Default RV dimensions based on Valhalla defaults for truck:
 * https://valhalla.github.io/valhalla/api/turn-by-turn/api-reference/#automobile-and-bus-costing-options
 */
const defaultRV = {
  axle_load: 9.07,
  hazmat: true,
  height: 4.11,
  length: 21.64,
  weight: 21.77,
  width: 2.6
};

const passengerCar = {
  height: 3.8,
  length: 8,
  weight: 6,
  width: 2.5
};

module.exports = {
  defaultRV,
  passengerCar
};
