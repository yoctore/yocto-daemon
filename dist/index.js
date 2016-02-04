/* yocto-daemon - Async tool to emulate an app like a system daemon - V1.1.5 */
function DaemonWrapper(a){this.DEFAULT_TASK_PRIORITY=1,this.logger=a,this.queue={},this.populateFn={},this.execFn={},this.thread=10,this.wait=10,this.errorRetry=10,this.nbError=0,this.pauseInterval=!1}var async=require("async"),_=require("lodash"),sleep=require("sleep"),logger=require("yocto-logger"),utils=require("yocto-utils"),Q=require("q");DaemonWrapper.prototype.retry=function(a){var b=this.errorRetry;return _.isNumber(a)&&!_.isNaN(a)&&(a>=0?(this.errorRetry=a,this.logger.info(["[ DaemonWrapper.retry ] - retry changed from [",b,"] to [",this.errorRetry,"]"].join(" "))):this.logger.warning(["[ DaemonWrapper.retry ] - retry cannot <= 0.","Keep to default current value :",this.errorRetry].join(" "))),_.isNumber(this.errorRetry)&&!_.isNaN(this.errorRetry)},DaemonWrapper.prototype.delay=function(a){var b=this.wait;return _.isNumber(a)&&!_.isNaN(a)&&(a>=0?(this.wait=a,this.logger.info(["[ DaemonWrapper.delay ] - delay changed from [",b,"] to [",this.wait,"]"].join(" "))):this.logger.warning(["[ DaemonWrapper.delay ] - delay cannot <= 0.","Keep to default current value :",this.wait].join(" "))),_.isNumber(this.wait)&&!_.isNaN(this.wait)},DaemonWrapper.prototype.use=function(a,b,c){return _.isFunction(a)&&_.isObject(a())?(_.isBoolean(b)&&b?this.execFn={method:a,context:c||this}:this.populateFn={method:a,context:c||this},!0):(this.logger.error(["[ DaemonWrapper.use ] - Given data is not function","or not a valid promise for :",b?"execFn":"populateFn"].join(" ")),!1)},DaemonWrapper.prototype.createQueue=function(){var a=this;return this.isReady(!0)?(this.logger.info("[ DaemonWrapper.createQueue ] - Creating Queue ..."),this.logger.info(["[ DaemonWrapper.createQueue ] - Queue worker concurrency is set to :",this.thread].join(" ")),this.queue=async.priorityQueue(function(b,c){a.logger.info("[ Queue.run ] - Receiving new data. process it !"),a.logger.debug(["[ Queue.run ] - Data is : ",utils.obj.inspect(b)].join(" ")),a.execFn.method.call(a.execFn.context,b).then(function(d){a.logger.info("[ Queue.run ] - Success response given. Calling given callback"),c({success:!0,error:!1,message:d,data:b})},function(d){a.logger.error(["[ Queue.run ] - Error response given. Error is :",d,"Calling given callback"].join(" ")),c({success:!1,error:!0,message:d,data:b})})},this.thread),this.queue.drain=function(){a.logger.info(["[ Queue.drain ] - Pending work is complete. Sleeping",a.wait,"seconds before next tick ..."].join(" ")),sleep.sleep(a.wait),a.isReady(!0)?a.chainPopulate():(a.logger.error([" [ Queue.drain ] - A problem occured.","Current queue process seems to be not ready yet"].join(" ")),a.stop())},this.queue.saturated=function(){a.logger.warning("[ Queue.saturated ] - Queue length hits the concurrency limit."),a.logger.info(["[ Queue.saturated ] - Changing Queue length concurrency","to an higher value."].join(" ")),a.logger.info(["[ Queue.saturated ] - Concurrency limit changing from [",a.queue.concurrency,"] to [",2*a.queue.concurrency,"]"].join(" ")),a.queue.concurrency=2*a.queue.concurrency},_.isObject(this.queue)&&!_.isEmpty(this.queue)):!1},DaemonWrapper.prototype.chainPopulate=function(){var a=this;return this.isReady(!0)?(this.populate().then(function(b){a.logger.info(["[ DaemonWrapper.chainPopulate ] - Populate function succeed.",_.isEmpty(b.data)?"Nothing to process.":"","Waiting draining ..."].join(" ")),_.isEmpty(b.data)&&a.queue.drain()},function(b){return a.nbError+=1,a.logger.error(["[ DaemonWrapper.chainPopulate ] - An error occured during populate.","Error is :",utils.obj.inspect(b)].join(" ")),a.nbError<a.errorRetry?(a.logger.error(["[ DaemonWrapper.chainPopulate ] - Waiting",a.wait,"seconds before next tick ..."].join(" ")),sleep.sleep(a.wait),a.chainPopulate(),void 0):(a.logger.error(["[ DaemonWrapper.chainPopulate ] - Too many errors occured.","Retry limit was reached."].join(" ")),a.stop())}),!0):(this.logger.error([" [ DaemonWrapper.chainPopulate ] - A problem occured.","Current queue process seems to be not ready yet"].join(" ")),this.stop())},DaemonWrapper.prototype.populate=function(){var a=Q.defer(),b=this,c=["[ DaemonWrapper.populate ] - A problem occured.","Current queue process seems to be not ready yet.","Cannot populate."].join(" ");return this.isReady(!0)?this.populateFn.method.apply(this.populateFn.context).then(function(c){b.logger.info(["[ DaemonWrapper.populate ] - success response given.","Try to normalize data before push into queue"].join(" "));var d={data:c,priority:b.DEFAULT_TASK_PRIORITY,callback:function(){b.logger.info(["[ Queue.run.callback ] - default callback was called.","Nothing to do here ...","Prefer defined your own callback ..."].join(" "))}};_.isObject(c)&&_.has(c,"data")&&_.has(c,"priority")&&_.isNumber(c.priority)&&_.has(c,"callback")&&_.isFunction(c.callback)&&(b.logger.debug(["[ DaemonWrapper.populate ] - Given populate function has","return a valid structure. normalize it"].join(" ")),d=c),b.logger.debug(["[ DaemonWrapper.populate ] - normalize data is :",utils.obj.inspect(d)].join(" ")),b.logger.info(["[ DaemonWrapper.populate ] - prepare to adding",d.data.length,"new data on queue."].join(" ")),_.isArray(d.data)&&!_.isEmpty(d.data)?_.each(d.data,function(c,e){var f=d.priority,g=d.callback,h=c;_.isObject(c)&&_.has(c,"data")&&_.has(c,"priority")&&_.isNumber(c.priority)&&_.has(c,"callback")&&_.isFunction(c.callback)&&(b.logger.debug([["[ DaemonWrapper.populate.item[",e,"]"].join(""),"] - return a valid structure. normalize it"].join(" ")),h=c.data,f=c.priority,g=c.callback),b.add(h,f,g),_.last(d.data)===c&&a.resolve(d)}):(_.isEmpty(d.data)||b.add(d.data,d.priority,d.callback),a.resolve(d))})["catch"](function(d){c=["[ DaemonWrapper.populate ] -","Given populate function has broadcasted an error.","Cannot populate."].join(" "),b.logger.error([c,"Error is :",utils.obj.inspect(d)].join(" ")),a.reject(c)}):a.reject(c),a.promise},DaemonWrapper.prototype.add=function(a,b,c){if(this.isReady(!0)){if(this.logger.info(["[ DaemonWrapper.add ] - Try to add item [",this.queue.length()+1,"] into queue with priority [",b,"]"].join(" ")),!_.isUndefined(a)&&!_.isNull(a)&&_.isNumber(b)&&b>=1&&_.isFunction(c))return this.queue.push(a,b,c),!0;this.logger.warning("[ DaemonWrapper.add ] - Invalid data given. Adding was omit")}return!1},DaemonWrapper.prototype.moreWorkers=function(a){return a=_.isNumber(a)&&a>0?a:10,this.changeWorkersConcurrency(a,!0)},DaemonWrapper.prototype.lessWorkers=function(a){return a=_.isNumber(a)&&a>0?a:10,this.changeWorkersConcurrency(a,!1)},DaemonWrapper.prototype.changeWorkersConcurrency=function(a,b){var c=this.queue.concurrency||this.thread,d=_.isUndefined(b)||_.isNull(b)||!_.isNumber(a)||_.isNaN(a)||!b?(this.queue.concurrency||this.thread)-a:(this.queue.concurrency||this.thread)+a;return 0>d&&(this.logger.warning(["[ DaemonWrapper.changeConcurrency ] - Change workers failed.","Minimum of workers must be >= 1 .","New wanted value is [",d,"], app changed it to minimum value"].join(" ")),d=1),_.isUndefined(this.queue.concurrency)?this.thread=d:this.queue.concurrency=d,this.logger.info(["[ DaemonWrapper.changeConcurrency ] - Workers concurrency change from [",c,"] to [",this.queue.concurrency||this.thread,"]"].join(" ")),_.isNumber(this.queue.concurrency||this.thread)&&(this.queue.concurrency||this.thread)>=1},DaemonWrapper.prototype.isReady=function(a){return _.isBoolean(a)&&a&&(_.isFunction(this.populateFn.method)&&_.isObject(this.populateFn.method.apply(this.populateFn.context))||this.logger.error(["[ DaemonWrapper.isReady ] - Wrapper is not ready.","populate Function is invalid.",'Please call "use" function',"before start your app"].join(" ")),_.isFunction(this.execFn.method)&&_.isObject(this.execFn.method.apply(this.execFn.context))||this.logger.error(["[ DaemonWrapper.isReady ] - Wrapper is not ready.","exec Function is invalid.",'Please call "use" function',"before start your app"].join(" "))),_.isFunction(this.populateFn.method)&&_.isObject(this.populateFn.method.apply(this.populateFn.context))&&_.isFunction(this.execFn.method)&&_.isObject(this.execFn.method.apply(this.execFn.context))},DaemonWrapper.prototype.stop=function(){return this.logger.info("[ DaemonWrapper.stop ] - Stop action was request."),this.kill(!0)},DaemonWrapper.prototype.start=function(){return this.isReady(!0)&&(this.createQueue()?this.chainPopulate():(this.logger.error("[ DaemonWrapper.start ] - Cannot createQueue. Cannot continue."),this.stop())),!0},DaemonWrapper.prototype.pause=function(){return this.isReady(!0)?(this.logger.info("[ DaemonWrapper.pause ] - Pausing Queue ..."),this.queue.pause(),this.pauseInterval=setInterval(function(){},1e3),this.queue.paused):this.stop()},DaemonWrapper.prototype.resume=function(){return this.isReady(!0)?(this.logger.info("[ DaemonWrapper.resume ] - Resume Queue ..."),_.isBoolean(this.pauseInterval)||_.isNull(this.pauseInterval)||_.isUndefined(this.pauseInterval)||(this.logger.info("[ DaemonWrapper.resume ] - Cleaning pause interval"),clearInterval(this.pauseInterval)),this.queue.resume(),this.queue.paused===!1):this.stop()},DaemonWrapper.prototype.clean=function(){return this.isReady(!0)?(this.logger.info("[ DaemonWrapper.delete ] - Starting Delete Queue ..."),this.pause()?(this.queue.tasks=[],0===this.queue.length()?(this.logger.info("[ DaemonWrapper.delete ] - Delete Queue Complete ..."),this.resume()):this.logger.warning("[ DaemonWrapper.delete ] - Cannot Delete Queue.")):this.logger.warning("[ DaemonWrapper.delete ] - Cannot Delete Queue. pause() failed"),0===this.queue.length()):this.stop()},DaemonWrapper.prototype.kill=function(a){return this.logger.info("[ DaemonWrapper.kill ] - Cleaning Queue ..."),this.queue.kill(),_.isBoolean(a)&&a&&(this.logger.info("[ DaemonWrapper.kill ] - Exiting ..."),process.exit(1)),!0},module.exports=function(a){return(_.isUndefined(a)||_.isNull(a))&&(logger.warning("[ DaemonWrapper.constructor ] - Invalid logger given. Use internal logger"),a=logger),new DaemonWrapper(a)};