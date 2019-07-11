import DBHelper from "./dbhelper";
// check if browser supports service worker
if('serviceWorker' in navigator) {
    // on load register service worker
    window.addEventListener('load', function() {
        // register service worker
        navigator.serviceWorker.register('sw.js') .then(
            function(reg) {
                console.log("registration success",reg.scope);
            }, 
            function(err){
                console.log("registration failed", err);
            });

        // Register background sync    
        navigator.serviceWorker.ready.then(swRegistration => {
            return swRegistration.sync.register('backgroundSync');
        });  
    });

    // user went offline
    window.addEventListener('offline', event => {
        console.log('Network went offline');
    });

    // user came online
    window.addEventListener('online', event => {
        console.log('Network is back online');
        DBHelper.processOfflineCalls();
    });
}
