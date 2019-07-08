import idb from 'idb';

/**
 * create index db
 */
const dbPromise = idb.open('restaurant-reviews-db', 1,function(upgradeDb) {
  const restaurantsStore = upgradeDb.createObjectStore('restaurants', { keyPath: 'id' });
  restaurantsStore.createIndex('id', 'id');
  const reviewsStore = upgradeDb.createObjectStore('reviews', { keyPath: 'id' });
  reviewsStore.createIndex('id', 'id');
});

/**
 * Common database helper functions.
 */
export default class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    //const port = 8010 // Change this to your server port
    //return `http://localhost:${port}/data/restaurants.json`;
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  static get REVIEWS_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/reviews`;
  }

  /**
   * 
   * @param restaurants 
   * Get restaurants from indexDB
   */
  static getRestaurantsFromDB() {
    return dbPromise.then(function(db){
      const tx = db.transaction('restaurants');
      const restuarantsStore = tx.objectStore('restaurants');
      const idIndex = restuarantsStore.index('id');
      return idIndex.getAll();
    });
  }

  /**
   * update the restuarant in index db
   * @param {*} restaurant 
   */
  static updateRestaurantInDB(restaurant) {
    return dbPromise.then(function(db){
      const store = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
      store.get(restaurant.id).then(idbRestaurant => store.put(restaurant));
    });
  }

  static addReviewInDB(review) {
    return dbPromise.then(function(db){
      const store = db.transaction('reviews', 'readwrite').objectStore('reviews');
      store.put(review);
    });
  }

  static removeReviewInDB(review) {
    return dbPromise.then(function(db){
      const store = db.transaction('reviews', 'readwrite').objectStore('reviews');
      store.delete(review.id);
    });
  }

  /**
   * 
   * @param restaurants
   * Store restuarants in indexDB
   */
  static storeRestaurantsInDB(restaurants) {
    dbPromise.then(function(db){
      const tx = db.transaction('restaurants','readwrite');
      const restaurantsStore = tx.objectStore('restaurants');
      restaurants.forEach(restuarant => restaurantsStore.put(restuarant));
      return tx.complete;
    });
  }

  static getReviewsFromDB() {
    return dbPromise.then(function(db){
      const tx = db.transaction('reviews');
      const reviewsStore = tx.objectStore('reviews');
      const idIndex = reviewsStore.index('id');
      return idIndex.getAll();
    });
  }

  static updateReviewInDB(review, newReview) {
    return dbPromise.then(function(db){
      const store = db.transaction('reviews', 'readwrite').objectStore('reviews');
      newReview ? 
        store.put(review) : 
        store.get(review.id).then(review => store.put(review));
    });
  }

  static storeReviewsInDB(reviews) {
    dbPromise.then(function(db){
      const tx = db.transaction('reviews','readwrite');
      const reviewsStore = tx.objectStore('reviews');
      reviews.forEach(review => reviewsStore.put(review));
      return tx.complete;
    });
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    var self = this;

    // if restaurants exists in db 
    // get restaurants
    this.getRestaurantsFromDB().then(function(restaurants){
      if(restaurants && restaurants.length > 0) {
        callback(null, restaurants);
        return;
      }
      let xhr = new XMLHttpRequest();
      xhr.open('GET', DBHelper.DATABASE_URL);
      xhr.onload = () => {
        if (xhr.status === 200) { // Got a success response from server!
          const restaurants = JSON.parse(xhr.responseText);
          // store in index db
          self.storeRestaurantsInDB(restaurants);
          callback(null, restaurants);
        } else { // Oops!. Got an error from server.
          const error = (`Request failed. Returned status of ${xhr.status}`);
          callback(error, null);
        }
      };
      xhr.send();
    });

  }

  /**
   * Fetch all reviews.
   */
  static fetchReviews(callback) {
    var self = this;
    this.getReviewsFromDB().then(function(reviews){
      if(reviews && reviews.length > 0) {
        callback(null, reviews);
        return;
      }
      let xhr = new XMLHttpRequest();
      xhr.open('GET', DBHelper.REVIEWS_URL);
      xhr.onload = () => {
        if(xhr.status === 200) {
          const reviews = JSON.parse(xhr.responseText);
          self.storeReviewsInDB(reviews);
          callback(null, reviews);
        } else {
          const err = (`Request failed. Returned status of ${xhr.status}`);
          callback(error, null);
        }
      };
      xhr.send();
    });
  }

  /**
   * 
   * set favorite
   */

  static setFavorite(id, fav, callback) {
    var self = this;
    let xhr = new XMLHttpRequest();
    xhr.open('PUT', `${DBHelper.DATABASE_URL}/${id}/?is_favorite=${fav}`);
    xhr.onload = () => {
      if(xhr.status === 200) {
        const restaurant = JSON.parse(xhr.responseText);
        // store updated restaurant in index db
        self.updateRestaurantInDB(restaurant);
        callback(null, restaurant);
      } else {
        const error = (`Request failed. Returned status of ${xhr.status}`);
        callback(error, null);
      }
    }
    xhr.send();
  }

  /**
   * delete review
   * @param {*} reviewid 
   * @param {*} callback 
   */
  static deleteReview(reviewid, callback) {
    var self = this;
    let xhr = new XMLHttpRequest();
    xhr.open('DELETE', `${DBHelper.REVIEWS_URL}/${reviewid}`);
    xhr.onload = () => {
      if(xhr.status === 200) {
        const rev_res = JSON.parse(xhr.responseText);
        self.removeReviewInDB(rev_res);
        callback(null, rev_res);
      } else {
        const error = (`Request failed. Returned status of ${xhr.status}`);
        callback(error, null);
      }
    }
    xhr.send();
  }

  /**
   * edit review
   * @param {*} id 
   * @param {*} review 
   * @param {*} callback 
   */
  static editReview(id, review, callback) {
    var self = this;
    let xhr = new XMLHttpRequest();
    xhr.open('PUT', `${DBHelper.REVIEWS_URL}/${id}`);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onload = () => {
      if(xhr.status === 200) {
        const rev_res = JSON.parse(xhr.responseText);
        rev_res.createdAt = new Date(rev_res.createdAt).getTime();
        rev_res.updatedAt = new Date(rev_res.updatedAt).getTime()
        self.addReviewInDB(rev_res);
        callback(null, rev_res);
      } else {
        const error = (`Request failed. Returned status of ${xhr.status}`);
        callback(error, null);
      }
    }
    xhr.send(JSON.stringify(review));
  }

  /**
   * Adding review
   * @param {*} review 
   * @param {*} callback 
   */
  static postReview(review, callback) {
    var self = this;
    let xhr = new XMLHttpRequest();
    xhr.open('POST', DBHelper.REVIEWS_URL);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onload = () => {
      if(xhr.status === 201) {
        const rev_res = JSON.parse(xhr.responseText);
        rev_res.createdAt = new Date(rev_res.createdAt).getTime();
        rev_res.updatedAt = new Date(rev_res.updatedAt).getTime()
        self.addReviewInDB(rev_res);
        callback(null, rev_res);
      } else {
        const error = (`Request failed. Returned status of ${xhr.status}`);
        callback(error, null);
      }
    }
    xhr.send(JSON.stringify(review));
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch review for given restuarant
   */
  static fetchReviewByRestuarantId(id, callback) {
    DBHelper.fetchAllReviews((error, allreviews) => {
      if (error) {
        callback(error, null);
      } else {
        const reviews = allreviews.filter(r => r.restaurant_id === id);
        if (reviews) {
          callback(null, reviews);
        } else {
          callback('Reviews for this restuarant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all reviews
   */
  static fetchAllReviews(callback) {
    // Fetch all reviews
    DBHelper.fetchReviews((error, reviews) => {
      if (error) {
        callback(error, null);
      } else {
        callback(null, reviews);
      } 
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}`);
  }

  /**
   * Map marker for a restaurant.
   */
   static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
      })
      marker.addTo(map);
    return marker;
  } 
  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

}

