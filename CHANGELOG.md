## 1.1.4 (2015-10-03) 

- Add more data on readme for priority usage.

## 1.1.3 (2015-10-03) 

- Fix a bug : when empty data was retrieve drain was not called => fixed.
- Add readme content

## 1.1.2 (2015-10-02) 

- Change call of execFn from FN.apply to FN.call

## 1.1.1  (2015-10-01)

- Add context execution on method call process

## 1.1.0 (2015-10-01)

- Migrate From PromiseJS to Q for promise usage

## 1.0.3 & 1.0.4 (2015-09-17)

- Change some logs usage on use method
- Change statement of start method 

## 1.0.2 (2015-09-17)

- Add auto grow up of concurrency limit on process queue

## 1.0.1 (2015-09-17)

- Change & Complete some test usage on var

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
