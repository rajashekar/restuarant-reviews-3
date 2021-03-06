import DBHelper from "./dbhelper";
let restaurant;
let newMap;
let tabindex = 11;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {  
  initMap();
});

/**
 * Initialize leaflet map
 */
const initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {      
      newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
        scrollWheelZoom: false
      });
      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: 'pk.eyJ1IjoicmFqYXNoZWtyIiwiYSI6ImNqcTVld29rZTBxMmM0M3Fmb2Q3em5rYWoifQ.JaCeguJUknKnWfP7dKGFlQ',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'    
      }).addTo(newMap);
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, newMap);
      fetchReviewsForRestaurant(restaurant.id);
    }
  });
}  
 
/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
} */

/**
 * Get current restaurant from page URL.
 */
const fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    const error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

const fetchReviewsForRestaurant = (restaurantId) => {
  DBHelper.fetchReviewByRestuarantId(restaurantId, (error, reviews) => {
    self.restaurant.reviews = reviews;
    if(!reviews) {
      console.error(error);
      return;
    } else {
      // fill reviews
      fillReviewsHTML();
    }
  });
}

/**
 * Create restaurant HTML and add it to the webpage
 */
const fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = `${DBHelper.imageUrlForRestaurant(restaurant)}.jpg`;
  image.alt = 'restaurant image of ' + restaurant.name;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // favorite
  showFavorite(restaurant.is_favorite);
  // review form
  processForm();
}

const processForm = () => {
  const reviewForm = document.getElementById('add-review');
  reviewForm.onsubmit = function(e) {
      console.log(e);
      if (e.preventDefault) e.preventDefault();
      // get form data
      const reviewObj = {
        "restaurant_id": self.restaurant.id,
        "name": e.target.name.value,
        "rating": parseInt(e.target.rating.value),
        "comments": e.target.comment.value
      }
      // make call and save to db
      storeReviewInDB(reviewObj);
      // clear form
      clearForm(e);
      return false;
  }
}

const storeReviewInDB = (review) => {
  DBHelper.postReview(review, (error, res) => {
     self.restaurant.reviews = [...self.restaurant.reviews, res];
      // add to dom 
      const ul = document.getElementById('reviews-list');
      tabindex++;
      ul.appendChild(createReviewHTML(res, tabindex));
  });
}

const clearForm = (e) => {
  e.target.name.value = "";
  e.target.comment.value = "";
  e.target.rating.value = 1;
}

const showFavorite = (is_favorite) => {
  const favorite = document.getElementById('favorite');
  favorite.innerHTML = is_favorite === "true" ?
    '<i id="fav" class="fa fa-star"></i><span id="favmsg">Favorited</span>' :
    '<i id="fav" class="fa fa-star-o"></i><span id="favmsg">Favorite this!</span>'
    registerFav();
}

const registerFav = () => {
  const fav = document.getElementById("fav");
  fav.onclick = function() {
    const is_fav = document.getElementsByClassName("fa-star");
    updateFavInDB(is_fav.length ? false : true);
  }    
}

const updateFavInDB = (fav) => {
  const id = getParameterByName('id');
  DBHelper.setFavorite(id, fav, (error, restaurant) => {
    self.restaurant = restaurant;
    if (!restaurant) {
      console.error(error);
      return;
    }
    fav? showFavorite("true") : showFavorite("false") ;
  });
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
const fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review, tabindex));
    tabindex++;
  });
  container.appendChild(ul);
}


const deleteReview = (reviewid) => {
  // delete review id
  DBHelper.deleteReview(reviewid, (error, review) => {
    // remove the review from restaurants array.
    self.restaurant.reviews = self.restaurant.reviews.filter(r => r.id !== review.id);
    // remove the review from UI. 
    const li = document.getElementById(`review-${review.id}`);
    li.remove();
  });
}

const processEditForm = (reviewid) => {
  const review = self.restaurant.reviews.find(r => r.id === reviewid);
  const li = document.getElementById(`review-${reviewid}`);
  const editform = document.getElementById('edit-review-form').cloneNode(true);

  li.children[0].style='display:none';
  editform.style = 'display:grid';
  li.appendChild(editform);
  editform.children[0].children[1].children[0].value = review.name;
  editform.children[1].children[1].children[0].value = review.rating;
  editform.children[2].children[1].children[0].value = review.comments;
  editform.onsubmit = function(e) {
    console.log(e);
    if (e.preventDefault) e.preventDefault();
    // get form data
    const reviewObj = {
      "name": e.target.name.value,
      "rating": parseInt(e.target.rating.value),
      "comments": e.target.comment.value
    }
    // make call and save to db
    DBHelper.editReview(reviewid, reviewObj, (error, review) => {
      self.restaurant.reviews = self.restaurant.reviews.map(r => r.id === review.id ? review : r);
      // update the review in UI.
      li.children[0].children[0].children[0].textContent = review.name;
      li.children[0].children[1].textContent = new Date(review.updatedAt).toLocaleDateString();
      li.children[0].children[2].textContent = `Rating: ${review.rating}`;
      li.children[0].children[3].textContent = review.comments;
      // delete form
      editform.remove();
      li.children[0].style='display:show'; 
    });

    return false;
  }
}

/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = (review, tabindex) => {
  const li = document.createElement('li');
  li.id = `review-${review.id}`;

  const rev_div = document.createElement('div');
  rev_div.id = `read-review-${review.id}`

  const name = document.createElement('p');
  const rev_span = document.createElement('span');
  rev_span.innerHTML = review.name;

  name.appendChild(rev_span);

  const edit = document.createElement('a');
  edit.className = "edit-review";
  edit.id = `edit-review-${review.id}`;
  edit.innerHTML = "edit";
  edit.onclick = function(e) {
    processEditForm(parseInt(e.target.id));
  }
  name.appendChild(edit);

  const del = document.createElement('a');
  del.className = "delete-review"
  del.id = review.id;
  del.innerHTML = "delete";
  del.onclick = function(e) {
    deleteReview(parseInt(e.target.id));
  }
  name.appendChild(del);

  rev_div.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = new Date(review.updatedAt).toLocaleDateString();
  rev_div.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  rev_div.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.setAttribute('tabindex', tabindex.toString());
  rev_div.appendChild(comments);

  li.appendChild(rev_div);
  
  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
const fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
