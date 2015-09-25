var logger      = require('yocto-logger');
var daemon      = require('../../src/index.js')(logger);
var Promise     = require('promise');
var _           = require('lodash');

logger.less();

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
var limit =  200;
var state = true;

// Process
function pfn() {
  return new Promise(function(fulfill, reject) {

      var d = [];
      
      for (var i = 0; i <= limit; i++) {
        d.push(datapopulate);
      }

      d = _.flatten(d);

      if (state) {
        fulfill(d);
      } else {
        reject(d);
      }
  });
}

pfn().then(function(success) {
  console.log('success populate');
}, function(error) {
  //console.log('error populate');
});

function efn() {
  return new Promise(function(fulfill, reject) {
    fulfill('yeah exec');
  });
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


  /*var d = setInterval(function() {
    console.log('====== CLEANNING =======');
    daemon.clean();
  }, 33000);
*/
}

