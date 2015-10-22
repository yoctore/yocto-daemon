## Overview

This module is a part of yocto node modules for NodeJS.

Please see [our NPM repository](https://www.npmjs.com/~yocto) for complete list of available tools (completed day after day).

This module is an async tool to emulate an app like a system daemon without setTimeout or setInterval method for the core of process.

## Motivation

After some analysis of logs and memory usage on a program who works like a system daemon
we decided to forget setInterval and setTimeout usage because memory leak it's important during 
huge action.

So we decided to create an app that use a queue system based on a populate & execution methods.

## How it works

This module start a queue process based on given delay (default 10 seconds).

It use a given populate function to retrieve data and a given execute function to process extra things (update, etc ...).

When queue will processed the app will be sleep during given delay.

## How to use 

```javascript
var logger      = require('yocto-logger');
var daemon      = require('yocto-daemon')(logger);
var _           = require('lodash');
var Q           = require('q');

// Create a populate function
function pfn() {

  // create an async process here
  var deferred = Q.defer();

  // Do your get data here
  // And when all is ok
  if (foo) {
    deferred.resolve(bar);
  } else {
    deferred.reject(bar);  
  }

  // return promise is required
  return deferred.promise;
}
// Create an execution method 
function efn(data) {
  // create an async process here
  var deferred = Q.defer();

  // Do your extra process here
  // And when all is ok
  if (foo) {
    deferred.resolve(bar);
  } else {
    deferred.reject(bar);  
  }

  // return promise is required
  return deferred.promise;
}

// set your populate function on your daemon system
daemon.use(pfn);
// set your execution function on your daemon system
daemon.use(efn, true);
// set your nb allowed retry 
daemon.retry(10);
// set your delay between each populate
daemon.delay(10);

// check is your daemon is ready
if (daemon.isReady(true)) {

  // start your daemon
  daemon.start();
}
```

## How to pass context on populate and execute method

Your can also set context of your populate and execute method. For this You must set the third parameters of use method.

```javascript
// set your populate function on your daemon system
daemon.use(pfn, false, CONTEXT_HERE);
// set your execution function on your daemon system
daemon.use(efn, true, CONTEXT_HERE);
```

## How to use priority on queue

By default pour populate method can return anything in what structure you want.

If you want use priority your populate method must return an object like : 

```javascript
{
  data      : 'YOUR_DATA_TO_EXECUTE_HERE', // WHAT YOU WANT HERE OBJ, ARRAY, ETC
  priority  : 'YOUR_PRIORITY_HERE', // MUST BE AN INTEGER
  callback  : function () {
    // A CALLBACK METHOD => PREFER USE YOUR OWN CALLBACK BY DEFAULT WE USE AN INTERNAL CALLBACK METHOD
  }
}
```

## Available methods

- start() : start daemon
- pause() : pause current queue **WARNING : In this function we use setTimeout, this will be remove in a future version**
- resume() : resume current queue
- clean() : clean current queue
- use(Function, Boolean) : to set populate and execute function on daemon. the second param must to set at true to set execute method
- lessWorkers() : add less workers on queue to manage concurrency limit
- moreWorkers(Integer) : add more workers on queue to manage concurrency limit. if integer is not defined default value (10) must be use

## Logging in tool

By Default this module include [yocto-logger](https://www.npmjs.com/package/yocto-logger) for logging. It's possible to inject in your router instance your current logger instance if is another yocto-logger instance.

##Changelog

All history is [here](https://gitlab.com/yocto-node-modules/yocto-daemon#README)


