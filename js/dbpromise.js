import idb from 'idb';

  /**
   * create index db
   */
  const dbPromise = idb.open('restaurant-reviews-db', 1,function(upgradedb) {
    upgradeDb.createObjectStore('restaurants', { keypath: 'id' });
  });