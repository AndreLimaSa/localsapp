async function fetchLocations() {
  try {
    const response = await fetch("https://localsapp-2.onrender.com/locations");
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const locations = await response.json();
    return locations;
  } catch (error) {
    console.error("Failed to fetch locations:", error);
    return [];
  }
}

let map;
let markerClusterGroup;

function initializeMap() {
  map = L.map("map").setView([0, 0], 2);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
  }).addTo(map);

  markerClusterGroup = L.markerClusterGroup({
    maxClusterRadius: 25,
    disableClusteringAtZoom: 15,
  });
  map.addLayer(markerClusterGroup);

  function onLocationFound(e) {
    const radius = e.accuracy / 2;

    L.marker(e.latlng)
      .addTo(map)
      .bindPopup(`You are within ${radius} meters from this point`)
      .openPopup();

    L.circle(e.latlng, radius).addTo(map);

    map.setView(e.latlng, 13);
  }

  function onLocationError(e) {
    alert(e.message);
  }

  map.on("locationfound", onLocationFound);
  map.on("locationerror", onLocationError);

  map.locate({ setView: true, maxZoom: 16 });
}

function addMarkersToMap(locations) {
  markerClusterGroup.clearLayers();
  if (locations.length === 0) {
    console.log("No locations to show on the map.");
    return;
  }

  locations.forEach((location) => {
    const marker = L.marker([location.latitude, location.longitude]);
    const popupContent = `
      <div>
        <h2>${location.title}</h2>
        <img src="${location.src}" alt="${
      location.title
    }" style="max-width: 100px; height: auto;">
        <p>${location.description}</p>
        <p><strong>Types:</strong> ${location.types.join(", ")}</p>
      </div>
    `;
    marker.bindPopup(popupContent);
    markerClusterGroup.addLayer(marker);
  });

  map.fitBounds(markerClusterGroup.getBounds());
}

async function renderLocations(locations) {
  try {
    const imageGrid = document.getElementById("image-grid");
    imageGrid.innerHTML = "";

    locations.forEach((location) => {
      const locationDiv = document.createElement("div");
      const totalVotes = location.likes + location.dislikes;
      const likePercentage =
        totalVotes === 0 ? 0 : (location.likes / totalVotes) * 100;
      const dislikePercentage =
        totalVotes === 0 ? 0 : (location.dislikes / totalVotes) * 100;
      locationDiv.className = "location";
      locationDiv.setAttribute("data-id", location._id);

      locationDiv.innerHTML = `
        <img src="${location.src}">
        <div class="icon-buttons">
          <button class="icon-button" onclick="likeLocation('${location._id}')">
            <i class="fas fa-thumbs-up"></i>
          </button>
          <button class="icon-button" onclick="dislikeLocation('${location._id}')">
            <i class="fas fa-thumbs-down"></i>
          </button>
          <button class="icon-button" onclick="saveFavorite('${location._id}')">
            <i class="fas fa-star"></i>
          </button>
        </div>
        <h3>${location.title}</h3>
        <p>${location.description}</p>
        <div class="location-info">
          <div class="progress-bar">
            <span class="likes-count">Likes: ${location.likes}</span>
            <span class="dislikes-count">Dislikes: ${location.dislikes}</span>
            <div class="like-bar" style="width: ${likePercentage}%;"></div>
            <div class="dislike-bar" style="width: ${dislikePercentage}%;"></div>
          </div>
        </div>
      `;

      imageGrid.appendChild(locationDiv);
    });
  } catch (error) {
    console.error("Error rendering locations:", error);
  }
}

// Event listeners for like and dislike buttons
async function likeLocation(locationId) {
  try {
    const response = await fetch(`/locations/${locationId}/like`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    if (response.ok) {
      updateLocationVotes(locationId, data.likes, data.dislikes);
    } else {
      console.error(data.message);
    }
  } catch (error) {
    console.error("Error liking location:", error);
  }
}

async function dislikeLocation(locationId) {
  try {
    const response = await fetch(`/locations/${locationId}/dislike`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    if (response.ok) {
      updateLocationVotes(locationId, data.likes, data.dislikes);
    } else {
      console.error(data.message);
    }
  } catch (error) {
    console.error("Error disliking location:", error);
  }
}

function updateLocationVotes(locationId, likes, dislikes) {
  const locationDiv = document.querySelector(`[data-id='${locationId}']`);
  const likesCount = locationDiv.querySelector(".likes-count");
  const dislikesCount = locationDiv.querySelector(".dislikes-count");
  const likeBar = locationDiv.querySelector(".like-bar");
  const dislikeBar = locationDiv.querySelector(".dislike-bar");

  likesCount.textContent = `Likes: ${likes}`;
  dislikesCount.textContent = `Dislikes: ${dislikes}`;

  const totalVotes = likes + dislikes;
  const likePercentage = totalVotes === 0 ? 0 : (likes / totalVotes) * 100;
  const dislikePercentage =
    totalVotes === 0 ? 0 : (dislikes / totalVotes) * 100;

  likeBar.style.width = `${likePercentage}%`;
  dislikeBar.style.width = `${dislikePercentage}%`;
}

// Function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

// Function to get the user's current location
function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          console.log("User's current location:", userLocation);
          resolve(userLocation);
        },
        (error) => {
          console.error("Geolocation error:", error);
          reject(error);
        }
      );
    } else {
      const error = new Error("Geolocation is not supported by this browser.");
      console.error(error.message);
      reject(error);
    }
  });
}

// Function to update the distance value displayed and call filterLocations
function updateDistanceValue(value) {
  document.getElementById("distanceValue").textContent = value;
  console.log("Distance slider value (updateDistanceValue):", value); // Log distance slider value when it changes
  filterLocations(); // Call filterLocations whenever the slider value changes
}

document.addEventListener("DOMContentLoaded", () => {
  const distanceSliderValue = document.getElementById("distanceSlider").value;
  console.log(
    "Initial distance slider value (DOMContentLoaded):",
    distanceSliderValue
  ); // Log initial distance slider value
  updateDistanceValue(distanceSliderValue);
  filterLocations(); // Initial call to load locations based on user's location and default distance
});

// Function to filter locations based on checkboxes and update the title
async function filterLocations() {
  const checkCultura = document.getElementById("culturabtn");
  const checkNatureza = document.getElementById("naturezabtn");
  const checkPraia = document.getElementById("praiabtn");
  const checkTrilho = document.getElementById("trilhobtn");
  const checkMerendas = document.getElementById("merendasbtn");
  const filterTitle = document.getElementById("filterTitle");
  const campingnaturezaCheckbox = document.getElementById(
    "campingchecknatureza"
  );
  const distanceSlider = document.getElementById("distanceSlider");

  const distanceValue = distanceSlider.value;

  console.log("Distance slider value (filterLocations):", distanceValue); // Log distance slider value when filtering

  try {
    // Get user's current location
    const userLocation = await getCurrentLocation();

    // Fetch locations from backend
    const locations = await fetchLocations();

    // Create a copy of the original locations array
    let filteredLocations = [...locations];

    // Get all checkboxes
    const checkboxes = document.querySelectorAll(".ctime");

    // Add click event listener to each checkbox
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("click", function () {
        // Uncheck all checkboxes except the one that was clicked
        checkboxes.forEach((cb) => {
          if (cb !== this) {
            cb.checked = false;
          }
        });
        // Call the filter function
        applyFilters();
      });
    });

    // Function to apply filters
    function applyFilters() {
      // Reset filteredLocations to original locations array
      filteredLocations = [...locations];

      // Filter based on checked checkboxes
      if (checkCultura.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.typeicon.includes("Cultura")
        );
        filterTitle.textContent = "Cultura";
      } else if (checkNatureza.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.typeicon.includes("Natureza")
        );
        filterTitle.textContent = "Natureza";
      } else if (checkPraia.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.typeicon.includes("Praia")
        );
        filterTitle.textContent = "Praia";
      } else if (checkTrilho.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.typeicon.includes("Trilho")
        );
        filterTitle.textContent = "Trilho";
      } else if (checkMerendas.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.typeicon.includes("Merendas")
        );
        filterTitle.textContent = "Merendas";
      } else {
        filterTitle.textContent = "Locais";
      }
      // Filter based on Merendas checkbox
      if (campingnaturezaCheckbox.checked) {
        filteredLocations = filteredLocations.filter((location) =>
          location.types.includes("WC")
        );
      }

      // Example: Filter based on distance slider value
      const updatedDistanceValue =
        document.getElementById("distanceSlider").value;
      console.log("Updated distance slider valuee:", updatedDistanceValue);

      filteredLocations = filteredLocations.filter((location) => {
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          location.latitude,
          location.longitude
        );

        return distance <= updatedDistanceValue;
      });

      // Clear current markers from map
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          map.removeLayer(layer);
        }
      });

      // Add markers for filtered locations
      addMarkersToMap(filteredLocations);

      // Update the image grid with filtered locations
      renderLocations(filteredLocations);
    }

    // Initial call to apply filters in case any checkboxes are pre-checked
    applyFilters();
  } catch (error) {
    console.error("Error filtering locations:", error);
    // Handle error as needed
  }
}

async function saveFavorite(locationId) {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("You need to log in first");
    return;
  }

  const response = await fetch(`/favorites/${locationId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (response.ok) {
    alert("Location saved to favorites");
  } else {
    const data = await response.json();
    alert(data.message);
  }
}

async function getFavorites() {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("You need to log in first");
    return;
  }

  const response = await fetch("/user/favorites", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.ok) {
    const data = await response.json();
    console.log("Favorites:", data.favorites);
  } else {
    const data = await response.json();
    alert(data.message);
  }
}

async function login(email, password) {
  const response = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (response.ok) {
    localStorage.setItem("token", data.token);
    window.location.href = "/index.html"; // Redirect after successful login
  } else {
    alert(data.message);
  }
}

async function initializeApp() {
  initializeMap();
  const locations = await fetchLocations();
  addMarkersToMap(locations);
  renderLocations(locations);
}

initializeApp();

function register() {
  window.open("https://localsapp-2.onrender.com/register", "_blank");
}
