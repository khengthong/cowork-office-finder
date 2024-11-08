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
                $('#distance').text(route.legs[0].distance.text);
                $('#duration').text(route.legs[0].duration.text);

                const estimatedArrival = new Date(Date.now() + route.legs[0].duration.value * 1000);

                // Format the arrival time in hh:mm am/pm
                const options = {
                    hour: 'numeric', 
                    minute: 'numeric', 
                    hour12: true // Use 12-hour format with am/pm
                };
                const arrivalTime = estimatedArrival.toLocaleString('en-US', options);

                $('#estimatedArrivalTime').text(arrivalTime);      
            } else {
                alert('Directions request failed due to ' + status);
            }
        });
    }
});