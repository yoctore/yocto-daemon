var logger      = require('yocto-logger');
var daemon      = require('../src/index.js')(logger);
var _           = require('lodash');
var Q           = require('q');

//logger.less();

// DATA
var seta = [
  { 
    toto : 1,
    a : {
      t : [  { 
          a : {}
        }, {
          b : {}
        }
      ]
    }
  }
];

var setb = [
  { key : 'VALUE 1' },
  { key : 'VALUE 2' },
  { key : 'VALUE 3' },
  { key : 'VALUE 4' },
  { key : 'VALUE 5' }
];

var setc = {
  priority : 1,
  callback : function() {
    console.log('ma callback');
  },
  data : { key : 'VALUE 1' }
};

var setd = [
{
  priority : 1,
  callback : function(data) {
    console.log('ma callback 2');
    console.log(data);
  },
  data : { key : 'VALUE 2' }
},
{
  priority : 1,
  callback : function(data) {
    console.log('ma callback 1');
    console.log(data);
  },
  data : { key : 'VALUE 1' }
} 
]

// used vars
var datapopulate =  setd;
var limit = 1;
var state = true;
var processed = 1;

// Process
function pfn() {

datapopulate = [
{
  priority : 1,
  callback : function(data) {
    console.log('ma callback 2');
    console.log(data);
  },
  data : { key : ( 'VALUE 2 ' + new Date().getTime()  + ' - ' + Math.random() ) }
},
{
  priority : 1,
  callback : function(data) {
    console.log('ma callback 1');
    console.log(data);
  },
  data : { key : ( 'VALUE 1 ' + new Date().getTime()  + ' - ' + Math.random() ) }
} 
]

  var deferred = Q.defer();
  //deferred.resolve([]);

  if (processed == 1) {
    var d = [];
    
    for (var i = 0; i <= limit; i++) {
      d.push(datapopulate);
    }
  
    d = _.flatten(d);
  
    if (state) {
      console.log('d =>', d);
      deferred.resolve(d);
      processed = 0;
    } else {
      deferred.reject(d);
    }
  } else {
    processed = 1;
    deferred.resolve([]);
  }


  return deferred.promise;
  /*return new Promise(function(fulfill, reject) {


  });*/
}



function efn(data) {
  /*return new Promise(function(fulfill, reject) {
    fulfill('yeah exec');
  });*/
  var deferred = Q.defer();
    deferred.resolve('yeah exec');
  return deferred.promise;
}
daemon.use(pfn);
daemon.use(efn, true);
daemon.retry(10);
daemon.delay(10);
//daemon.retry(3);
//daemon.delay(5);

if (daemon.isReady(true)) {
/*  daemon.lessWorkers();
  daemon.lessWorkers();
  daemon.moreWorkers();  
  daemon.moreWorkers(5000);
*/
  daemon.start();
/*  
  var pause = setInterval(function() {
    if (!daemon.queue.paused) {
      console.log('====== PAUSE =======');
      daemon.pause();
    }

  }, 5000);
  
  var resume = setInterval(function() {
    console.log('====== RESUME =======');
    daemon.resume();
  }, 27500);

*/
  /*var d = setInterval(function() {
    console.log('====== CLEANNING =======');
    daemon.clean();
  }, 33000);
*/
}

