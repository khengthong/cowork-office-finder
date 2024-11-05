let map;
let geocoder;
let directionsService;
let directionsRenderer;

function initMap () {
    geocoder = new google.maps.Geocoder();
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();

    // Check if geolocation is supported by the browser
    if ("geolocation" in navigator) {
        // Prompt user for permission to access their location
        navigator.geolocation.getCurrentPosition (
            // Success callback function
            successful,
            // Error callback function
            (error) => {
                // Handle errors, e.g. user denied location sharing permissions
                console.error("Error getting user location:", error);
            }
        );
    } else {
        // Geolocation is not supported by the browser
        console.error("Geolocation is not supported by this browser.");
    }
}

function successful (position) {
    // Get the user's latitude and longitude coordinates
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    // Do something with the location data, e.g. display on a map
    console.log(`Latitude: ${lat}, longitude: ${lng}`);

    var latlng = new google.maps.LatLng(lat, lng);
    geocoder.geocode({
        'location': latlng,
        'fulfillOnZeroResults': true,
      })
      .then((response) => {
        console.log(response.plus_code);
        $("#origin").val(response.results[0].formatted_address);
      })
      .catch((error) => {
        window.alert(`Error`);
      });

    map = new google.maps.Map (document.getElementById ("map"), {
        // center: { lat: lat, lng: lng },
        center: latlng,
        zoom: 14
    });

    const marker = new google.maps.Marker ({
       // position: { lat: lat, lng: lng },
        position: latlng,
        map: map,
        Label: "A",
        title: "Current Location",
        animation: google.maps.Animation.DROP
    });

    directionsRenderer.setMap(map);
}

function findRoute () {
    const origin = $("#origin").val();
    const destination = $("#destination").val();
    const mode = $("#mode").val();
    
    console.log (origin + ", " + destination + ", " + mode);

    directionsService.route(
        {
            origin: { query: origin },
            destination: { query: destination },
            travelMode: mode
        },
        (response, status) => {
            if (status === "OK") {
                directionsRenderer.setDirections(response);
            } else {
                window.alert("Directions request failed due to " + status);
            }
        }
    );
}