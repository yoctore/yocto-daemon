var async   = require('async');
var _       = require('lodash');
var sleep   = require('sleep');
var Promise = require('promise');
var logger  = require('yocto-logger');
var utils   = require('yocto-utils');

/**
 *
 * Daemon wrapper core interface
 *
 * This module create & manage a program like a daemon
 *
 * @date : 24/09/2015
 * @author : Mathieu ROBERT <mathieu@yocto.re>
 * @copyright : Yocto SAS, All right reserved
 *
 * @class DaemonWrapper
 */
function DaemonWrapper (logger) {
  /**
   * Default task priority value
   *
   * @const logger
   */
  this.DEFAULT_TASK_PRIORITY  = 1;

  /**
   * Logger instance
   *
   * @property logger
   */
  this.logger                 = logger;

  /**
   * Default queue instance
   *
   * @property queue
   * @default {}
   */
  this.queue                  = {};

  /**
   * populate Fn to populate queue
   *
   * @property populateFn
   * @default {}
   */
  this.populateFn             = {};

  /**
   * execution Fn to execute on each task
   *
   * @property execFn
   * @default {}
   */
  this.execFn                 = {};

  /**
   * Default nb thread concurency
   *
   * @property thread
   * @default 10
   */
  this.thread                 = 10;

  /**
   * Waiting time between each populate action
   *
   * @property wait
   * @default 10
   */
  this.wait                   = 10;

  /**
   * Nb error retry allowed
   *
   * @property errorRetry
   * @default 10
   */
  this.errorRetry             = 10;

  /**
   * Current Nb error ocurend on populate
   *
   * @property nbError
   * @default 10
   */
  this.nbError                = 0;

  /**
   * Interval instance if pause is call
   *
   * @property pauseInterval
   * @default false
   */
  this.pauseInterval          = false;
}

/**
 * Change the retry value when error occured
 *
 * @param {Integer} value nb retry value to change
 * @return {Boolean} true if value is correct false otherwise
 */
DaemonWrapper.prototype.retry = function (value) {
  // default value
  var from = this.errorRetry;

  // check and assign
  if (_.isNumber(value) && !_.isNaN(value)) {
    // valid value ?
    if (value >= 0) {
      // assign
      this.errorRetry = value;

      // what is happening ?
      this.logger.info([ '[ DaemonWrapper.retry ] - retry changed from [',
                         from, '] to [', this.errorRetry, ']' ].join(' '));

    } else {
      // log pb
      this.logger.warning([ '[ DaemonWrapper.retry ] - retry cannot <= 0.',
                            'Keep to default current value :',
                            this.errorRetry ].join(' '));
    }
  }

  // default statement
  return _.isNumber(this.errorRetry) && !_.isNaN(this.errorRetry);
};

/**
 * Change the delay value to wait after queue process (in seconds)
 *
 * @param {Integer} value wait seconds value to change
 * @return {Boolean} true if value is correct false otherwise
 */
DaemonWrapper.prototype.delay = function (value) {
  // default value
  var from = this.wait;

  // check and assign
  if (_.isNumber(value) && !_.isNaN(value)) {
    // valid value ?
    if (value >= 0) {
      // assign
      this.wait = value;

      // what is happening ?
      this.logger.info([ '[ DaemonWrapper.delay ] - delay changed from [',
                         from, '] to [', this.wait, ']' ].join(' '));
    } else {
      // log pb
      this.logger.warning([ '[ DaemonWrapper.delay ] - delay cannot <= 0.',
                            'Keep to default current value :',
                            this.wait ].join(' '));
    }
  }

  // default statement
  return _.isNumber(this.wait) && !_.isNaN(this.wait);
};

/**
 * Set the current populate & exec function for queue call
 *
 * @param {Function} fn function to use on populate action
 * @param {Boolean} exec true if we want to define exec function
 * @return {Boolean} true is set si ok false otherwise
 */
DaemonWrapper.prototype.use = function (fn, exec) {
  // test value first
  if (!_.isFunction(fn)) {
    // log message
    this.logger.error('[ DaemonWrapper.use ] - given data is not function.');
    // error statement
    return false;
  }

  // testing fn
  if (!(fn() instanceof Promise)) {
    // log message
    this.logger.error('[ DaemonWrapper.use ] - given function is not a valid promise.');
    // error statement
    return false;
  }

  // is for exec ?
  if (_.isBoolean(exec) && exec) {
    // assign exec
    this.execFn = fn;
  } else {
    // assign populate
    this.populateFn = fn;
  }

  // default statement
  return true;
};

/**
 * Create a priority queue
 *
 * @return {Boolean} true if all is ok false otherwise
 */
DaemonWrapper.prototype.createQueue = function () {
  // save context
  var context = this;

  // app is ready ??
  if (this.isReady(true)) {
    // call message
    this.logger.info('[ DaemonWrapper.createQueue ] - Creating Queue ...');
    this.logger.info([ '[ DaemonWrapper.createQueue ] - Queue worker concurrency is set to :',
                       this.thread,
                     ].join(' '));

    /**
     * Create priority Queue with specific callback
     */
    this.queue = async.priorityQueue(function (task, callback) {
      // new data ??
      context.logger.info('[ Queue.run ] - Receiving new data. process it !');
      // some debug data
      context.logger.debug([ '[ Queue.run ] - Data is : ', utils.obj.inspect(task) ].join(' '));
      // process promise style
      context.execFn(task).then(function (success) {
        // success so log it
        context.logger.info('[ Queue.run ] - Success response given. Calling given callback');
        // call callback
        callback({ success : true, error : false, message : success, data : task });
      }, function (error) {
        // error so log it
        context.logger.error([ '[ Queue.run ] - Error response given. Error is :',
                                error, 'Calling given callback' ].join(' '));
        // call callback
        callback({ success : false, error : true, message : error, data : task });
      });
    }, this.thread);

    /**
     * Queue will call this whenever all pending work is completed
     * so wait the valid delay time and check again for more arriving task
     */
    this.queue.drain  = function () {
      // message
      context.logger.info([ '[ Queue.drain ] - Pending work is complete. Sleeping',
                      context.wait, 'seconds before next tick ...' ].join(' '));
      // sleeping before next tick
      sleep.sleep(context.wait);
      // check each time if queue ready
      if (context.isReady(true)) {
        // process data
        context.chainPopulate();
      } else {
        // message pb
        context.logger.error([ ' [ Queue.drain ] - A problem occured.',
                               'Current queue process seems to be not ready yet' ].join(' '));
        // stopping queue process
        context.stop();
      }
    };

    /**
     * Saturate function when workers limit was pass
     */
    this.queue.saturated = function () {
      // warning message
      context.logger.warning('[ Queue.saturated ] - Queue length hits the concurrency limit.');
      context.logger.info([ '[ Queue.saturated ] - Changing Queue length concurrency',
                            'to an higher value.' ].join(' '));
      context.logger.info([ '[ Queue.saturated ] - Concurrency limit changing from [',
                             context.queue.concurrency, '] to [',
                             context.queue.concurrency  * 2, ']' ].join(' '));
      // changing value
      context.queue.concurrency = context.queue.concurrency * 2;
    };

    // default statement
    return _.isObject(this.queue) && !_.isEmpty(this.queue);
  }

  // default statement
  return false;
};

/**
 * Wrapper method to chain populate call with promise management.
 * After too many errors current app exiting with code 1
 */
DaemonWrapper.prototype.chainPopulate = function () {
  // save current context
  var context = this;

  // app is ready ?
  if (this.isReady(true)) {
    // main populate
    this.populate().then(function () {
      context.logger.info([ '[ DaemonWrapper.chainPopulate ] - Populate function succeed.',
                            'nothing to process. waiting draining ...' ].join(' '));
    }, function (error) {
      // change nb error value
      context.nbError += 1;
      // message
      context.logger.error([ '[ DaemonWrapper.chainPopulate ] - An error occured during populate.',
                             'Error is :', utils.obj.inspect(error) ].join(' '));

      // retry is over ??
      if (context.nbError < context.errorRetry) {
        context.logger.error(['[ DaemonWrapper.chainPopulate ] - Waiting', context.wait,
                               'seconds before next tick ...' ].join(' '));
        // sleeping before next tick
        sleep.sleep(context.wait);
        // here we go again
        context.chainPopulate();
      } else {
        // log error message
        context.logger.error(['[ DaemonWrapper.chainPopulate ] - Too many errors occured.',
                              'Retry limit was reached.' ].join(' '));
        // stop program
        return context.stop();
      }
    });
  } else {
    // message pb
    this.logger.error([ ' [ DaemonWrapper.chainPopulate ] - A problem occured.',
                           'Current queue process seems to be not ready yet' ].join(' '));
    // stopping queue process
    return this.stop();
  }

  // default statement
  return true;
};

/**
 * Default populate function use in internal
 *
 * @return {Object} a promise object
 */
DaemonWrapper.prototype.populate = function () {
  // save current context
  var context = this;
  // default statement
  return new Promise(function (fulfill, reject) {
    var message = [ '[ DaemonWrapper.populate ] - A problem occured.',
                    'Current queue process seems to be not ready yet.',
                    'Cannot populate.' ].join(' ');
    if (!context.isReady(true)) {
      reject(message);
    } else {
      // populate call
      context.populateFn().then(function (success) {
        // success retrieve message
        context.logger.info([ '[ DaemonWrapper.populate ] - success response given.',
                              'Try to normalize data before push into queue' ].join(' '));
        // default assignement
        var normalized = {
          data      : success,
          priority  : context.DEFAULT_TASK_PRIORITY,
          callback  : function () {
            // default message for default callback
            context.logger.info([ '[ Queue.run.callback ] - default callback was called.',
                                  'Nothing to do here ...',
                                  'Prefer defined your own callback ...' ].join(' '));
          }
        };

        // check struct of data if is an object ?
        if (_.isObject(success) && _.has(success, 'data') &&
          _.has(success, 'priority') && _.isNumber(success.priority) &&
          _.has(success, 'callback') && _.isFunction(success.callback)) {
          // log message
          context.logger.debug([ '[ DaemonWrapper.populate ] - Given populate function has',
                                   'return a valid structure. normalize it' ].join(' '));
          // process normalize
          normalized = success;
        }

        // debug log to see what we insert into queue
        context.logger.debug([ '[ DaemonWrapper.populate ] - normalize data is :',
                             utils.obj.inspect(normalized) ].join(' '));
        // prepare message
        context.logger.info([ '[ DaemonWrapper.populate ] - prepare to adding',
                              normalized.data.length, 'new data on queue.' ].join(' '));
        // is array ?
        if (_.isArray(normalized.data)) {
          // parse all data
          _.each(normalized.data, function (d, key) {
            // save current priority
            var priority  = normalized.priority;
            // save callback;
            var cback     = normalized.callback;
            // save value
            var value     = d;

            // check struct of data if is an object ?
            if (_.isObject(d) && _.has(d, 'data') &&
              _.has(d, 'priority') && _.isNumber(d.priority) &&
              _.has(d, 'callback') && _.isFunction(d.callback)) {
              // log message
              context.logger.debug([ [ '[ DaemonWrapper.populate.item[', key, ']' ].join(''),
                                         '] - return a valid structure. normalize it' ].join(' '));
              // change value
              value     = d.data;
              priority  = d.priority;
              cback     = d.callback;
            }

            // add value
            context.add(value, priority, cback);

            // is last item ? for callback
            if (_.last(normalized.data) === d) {
              // success callback here
              fulfill(normalized);
            }
          });
        } else {
          // add value
          context.add(normalized.data, normalized.priority, normalized.callback);
          // success callback here
          fulfill(normalized);
        }
      }, function (error) {
        // default error message
        message = [ '[ DaemonWrapper.populate ] -',
                    'Given populate function has broadcasted an error.',
                    'Cannot populate.'].join(' ');
        // log error message
        context.logger.error([ message, 'Error is :', utils.obj.inspect(error) ].join(' '));
        // reject process
        reject(message);
      });
    }
  });
};

/**
 * Add new item on queue list
 *
 * @param {Mixed} item data to insert into priority queue
 * @param {Integer} priority priority valut to use in queue
 * @param {Function} callback function to call when action is processed
 * @return {Boolean} true if all is ok false otherwise
 */
DaemonWrapper.prototype.add = function (item, priority, callback) {
  // all is ready ?
  if (this.isReady(true)) {
    // log message
    this.logger.info([ '[ DaemonWrapper.add ] - Try to add item [',
                       (this.queue.length() + 1),
                       '] into queue with priority [',
                       priority, ']' ].join(' '));

    // check type of value
    if (!_.isUndefined(item) && !_.isNull(item) &&
        _.isNumber(priority) && priority >= 1 && _.isFunction(callback)) {

      // push to queue
      this.queue.push(item, priority, callback);
      // valid statement
      return true;
    } else {
      // invalid data given log it
      this.logger.warning('[ DaemonWrapper.add ] - Invalid data given. Adding was omit');
    }
  }

  // default statement
  return false;
};

/**
 * Add more workers on current queue
 *
 * @param {Integer} value wanted value to add on workers
 * @return {Boolean} true if all is ok false otherwise
 */
DaemonWrapper.prototype.moreWorkers = function (value) {
  // define default value
  value = _.isNumber(value) && value > 0 ? value : 10;
  // default statement
  return this.changeWorkersConcurrency(value, true);
};

/**
 * remove workers on current queue
 *
 * @param {Integer} value wanted value to add on workers
 * @return {Boolean} true if all is ok false otherwise
 */
DaemonWrapper.prototype.lessWorkers = function (value) {
  // define default value
  value = _.isNumber(value) && value > 0 ? value : 10;
  // default statement
  return this.changeWorkersConcurrency(value, false);
};

/**
 * Default function to change nb workers Concurrency
 *
 * @param {Integer} value wanted value to add on workers
 * @param {Boolean} higher wanted value to add on workers
 * @return {Boolean} true if all is ok false otherwise
 */
DaemonWrapper.prototype.changeWorkersConcurrency = function (value, higher) {
  // save current nb works for display
  var before  = this.queue.concurrency || this.thread;
  // change value
  var workers = !_.isUndefined(higher) && !_.isNull(higher) &&
                _.isNumber(value) && !_.isNaN(value) &&
                higher ? (this.queue.concurrency || this.thread) + value :
                (this.queue.concurrency || this.thread) - value;

  // prevent 0 workers ==> is invalid in async process
  if (workers < 0) {
    // be carefull minimum value required
    this.logger.warning([ '[ DaemonWrapper.changeConcurrency ] - Change workers failed.',
                          'Minimum of workers must be >= 1 .',
                          'New wanted value is [', workers, '], app changed it to minimum value'
                        ].join(' '));
    // default min workers value
    workers = 1;
  }

  // set value
  if (!_.isUndefined()) {
    this.queue.concurrency = workers;
  } else {
    this.thread = workers;
  }

  // log message
  this.logger.info([ '[ DaemonWrapper.changeConcurrency ] - Workers concurrency change from [',
                    before, '] to [', (this.queue.concurrency || this.thread), ']' ].join(' '));
  // default statement
  return _.isNumber(this.queue.concurrency || this.thread) &&
        (this.queue.concurrency || this.thread) >= 1;
};

/**
 * Check status of current daemon wrapper
 *
 * @param {Boolean} showErrors true is we want to show error
 * @return {Boolean} true is all is ok, false otherwise
 */
DaemonWrapper.prototype.isReady = function (showErrors) {
  if (_.isBoolean(showErrors) && showErrors) {
    // populate function
    if (!_.isFunction(this.populateFn) || !(this.populateFn() instanceof Promise)) {
      this.logger.error([ '[ DaemonWrapper.isReady ] - Wrapper is not ready.',
                             'populate Function is invalid.',
                             'Please call "use" function',
                             'before start your app' ].join(' '));

    }
    // exec function
    if (!_.isFunction(this.execFn) || !(this.execFn() instanceof Promise)) {
      this.logger.error([ '[ DaemonWrapper.isReady ] - Wrapper is not ready.',
                             'exec Function is invalid.',
                             'Please call "use" function',
                             'before start your app' ].join(' '));
    }
  }

  // default statement
  return _.isFunction(this.populateFn) && (this.populateFn() instanceof Promise) &&
         _.isFunction(this.execFn) && (this.execFn() instanceof Promise);
};

/**
 * Stop current program and exiting by process.exit
 *
 * @return {Boolean} true if all is ok false otherwise
 */
DaemonWrapper.prototype.stop = function () {
  // log message
  this.logger.info('[ DaemonWrapper.stop ] - Stop action was request.');

  // default statement
  return this.kill(true);
};

/**
 * Start a system daemon. is an error occured app exiting ..
 *
 * @return {Boolean} true is queue is started false otherwise
 */
DaemonWrapper.prototype.start = function () {
  // all is ok here ??
  if (this.isReady(true)) {
    // create queue
    if (this.createQueue()) {
      // call internal populate function
      this.chainPopulate();
    } else {
      // en error occured
      this.logger.error('[ DaemonWrapper.start ] - Cannot createQueue. Cannot continue.');
      // stop
      this.stop();
    }
  }
  // default statement
  return this.queue.started;
};

/**
 * Pause current queue if is in paused state
 *
 * @return {Boolean} true if all is ok false otherwise
 */
DaemonWrapper.prototype.pause = function () {
  // is ready ??
  if (this.isReady(true)) {
    // log message
    this.logger.info('[ DaemonWrapper.pause ] - Pausing Queue ...');
    // process
    this.queue.pause();

    // check status
    this.pauseInterval = setInterval(function () {
      // waiting since resume where interval was clear
    }, 1000);

    // default statement
    return this.queue.paused;
  }

  // default statement
  return this.stop();
};

/**
 * Resume current queue if is in paused state
 *
 * @return {Boolean} true if all is ok false otherwise
 */
DaemonWrapper.prototype.resume = function () {
  // is ready ??
  if (this.isReady(true)) {
    // log message
    this.logger.info('[ DaemonWrapper.resume ] - Resume Queue ...');

    // check pause interval
    if (!_.isBoolean(this.pauseInterval) && !_.isNull(this.pauseInterval) &&
        !_.isUndefined(this.pauseInterval)) {
      this.logger.info('[ DaemonWrapper.resume ] - Cleaning pause interval');
      // clear interval
      clearInterval(this.pauseInterval);
    }

    // process
    this.queue.resume();

    // default statement
    return this.queue.paused === false;
  }

  // default statement
  return this.stop();
};

/**
 * clean current queue
 *
 * @return {Boolean} true if all is ok false otherwise
 */
DaemonWrapper.prototype.clean = function () {
  // is ready ??
  if (this.isReady(true)) {
    // log message
    this.logger.info('[ DaemonWrapper.delete ] - Starting Delete Queue ...');

    // pause app before
    if (this.pause()) {
      // process to empty
      this.queue.tasks = [];

      // is correctly clean ??
      if (this.queue.length() === 0) {
        // restart
        this.logger.info('[ DaemonWrapper.delete ] - Delete Queue Complete ...');
        // resume
        this.resume();
      } else {
        // queue is not empty
        this.logger.warning('[ DaemonWrapper.delete ] - Cannot Delete Queue.');
      }
    } else {
      // pause failed so we can't delete
      this.logger.warning('[ DaemonWrapper.delete ] - Cannot Delete Queue. pause() failed');
    }

    // default statement
    return this.queue.length() === 0;
  }

  // default statement
  return this.stop();
};

/**
 * kill & clean current queue. exit if needed
 *
 * @param {Boolean} exit if true process.exit was call
 * @return {Boolean} always true
 */
DaemonWrapper.prototype.kill = function (exit) {
  // log message
  this.logger.info('[ DaemonWrapper.kill ] - Cleaning Queue ...');
  // kill queue
  this.queue.kill();

  // exit process is required ?
  if (_.isBoolean(exit) && exit) {
    // log message
    this.logger.info('[ DaemonWrapper.kill ] - Exiting ...');
    // process exit
    process.exit(1);
  }

  // default statement
  return true;
};

// Default export
module.exports = function (l) {
  // is a valid logger ?
  if (_.isUndefined(l) || _.isNull(l)) {
    logger.warning('[ DaemonWrapper.constructor ] - Invalid logger given. Use internal logger');
    // assign
    l = logger;
  }

  // default statement
  return new (DaemonWrapper)(l);
};

