## 1.0.0 (2015-09-17)

Base implementation of module.
Method added : 

 - retry : set nb value of retry when error occured during populate
 - delay : set value of populate delay
 - use  : initialize populate FN et exec Fn
 - createQueue : Create main queue
 - chainPopulate : utility function called to chain populate in any case 
 - populate : main function call by chainPopulate to process populate action
 - add : function used to add an item to queue
 - moreWorkers : add more workers on queue
 - lessWorkers : remove some workers on queue
 - changeWorkersConcurrency : change the workers concurrency
 - isReady : check if app is ready
 - stop : stop app
 - pause : pause app with set interval
 - resume : resume app and clean interval
 - clean : clean current queue
 - kill : kill queue and set queue to idle state
