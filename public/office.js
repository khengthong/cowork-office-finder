$(document).ready(function() {

    // Set default values for date and time
    let today = new Date().toISOString().split('T')[0];
    $('#departureDate').val(today);
    let currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    $('#departureTime').val(currentTime);

    // Initialize Google Map
    let map = new google.maps.Map(document.getElementById('map'), {
        zoom: 14,
        center: {lat: -34.397, lng: 150.644}
    });

    let directionsService = new google.maps.DirectionsService();
    let directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);
    showMap();

    $('#showDirectionBtn').click(showMap);
    
    function showMap() {
         let mode = $('#modeOfTransport').val();
        let date = $('#departureDate').val();
        let time = $('#departureTime').val();

        let start = $('#currentLocation').prop("innerText"); 
        let end = $('#officeAddress').prop("innerText"); 

    //    alert ("start: " + start + ", end: " + end);

        let request = {
            origin: { query: start },
            destination: { query: end },
            travelMode: google.maps.TravelMode[mode.toUpperCase()],
            drivingOptions: {
                departureTime: new Date(`${date}T${time}`),
                trafficModel: 'bestguess'
            }
        };

        directionsService.route(request, function(result, status) {
            if (status === 'OK') {
                directionsRenderer.setDirections(result);

 // Extracting route information
 const route = result.routes[0]; // Get the first (best) route

 // Total distance
 const distance = route.legs[0].distance.text;
 // Total duration
 const duration = route.legs[0].duration.text;
 // Estimated arrival time
 const arrivalTime = new Date(Date.now() + route.legs[0].duration.value * 1000).toLocaleTimeString(); // if you need live traffic
 // Start and end addresses
 const startAddress = route.legs[0].start_address;
 const endAddress = route.legs[0].end_address;

 // Log the information to the console for demonstration
 console.log('Distance: ' + distance);
 console.log('Duration: ' + duration);
 console.log('Estimated Arrival Time: ' + arrivalTime);
 console.log('Start Address: ' + startAddress);
 console.log('End Address: ' + endAddress);

 // Optional: Extract steps and display them
 const steps = route.legs[0].steps;
 steps.forEach((step, index) => {
     console.log((index + 1) + ': ' + step.instructions + ' (' + step.distance.text + ', ' + step.duration.text + ')');
 });
      
            } else {
                alert('Directions request failed due to ' + status);
            }
        });
    }
});
