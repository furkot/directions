var waterfall = require('run-waterfall');

module.exports = strategy;

var END = 'end processing';

/**
 * Process the list of tasks one by one,ending processing as soon as one task says so.
 * The next task is invoked with parameters set by the previous task.
 * It is a cross between async operations: waterfall and some
 * @param tasks list of tasks
 * @param ... any number of parameters to be passed to the first task
 * @param callback the last argument is an optional callback called after tasks have been processed;
 *   called with error followed by the parameters passed from the last invoked task
 */
function strategy(tasks) {
  var callback = arguments[arguments.length - 1],
    parameters = Array.prototype.slice.call(arguments, 0, -1);
  parameters[0] = undefined;

  tasks = tasks.reduce(function (result, task) {
    result.push(function () {
      var callback = arguments[arguments.length - 1];
        parameters = Array.prototype.slice.call(arguments, 0, -1);
      parameters.push(function (err, trueValue) {
        var parameters = [err].concat(Array.prototype.slice.call(arguments, 2));
        if (!err && trueValue) {
          // jump out of processing
          parameters[0] = END;
        }
        callback.apply(undefined, parameters);
      });
      task.apply(undefined, parameters);
    });
    return result;
  }, [
    function (fn) {
      fn.apply(undefined, parameters);
    }
  ]);
  waterfall(tasks, function (err) {
    var parameters = [err].concat(Array.prototype.slice.call(arguments, 1));
    if (err === END) {
      parameters[0] = undefined;
    }
    callback.apply(undefined, parameters);
  });
}
