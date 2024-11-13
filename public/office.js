$(document).ready(function() {
    // set default values for date and time
    let today = new Date().toLocaleDateString('en-CA'); // 'en-CA' gives YYYY-MM-DD format;
    
    $('#departureDate').val(today);
    let currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    $('#departureTime').val(currentTime);

    // initialize Google Map
    let map = new google.maps.Map(document.getElementById('map'), {
        zoom: 14,
        center: {lat: -34.397, lng: 150.644}
    });

    let geocoder = new google.maps.Geocoder();
    let directionsService = new google.maps.DirectionsService();
    let directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);
    
    let journey = {};

    showMapandWeather();

    // set handler for showDirectionBtn
    $('#showDirectionBtn').click(showMapandWeather);
    
    // show map and weather data
    function showMapandWeather () {
        var departureDate = $('#departureDate').val();
        var departureTime = $('#departureTime').val();
        var departureDateTime = new Date(`${departureDate}T${departureTime}`);

        journey = { 
            originaddress: $('#currentLocation').prop("innerText"),
            coofficename: $('#officeTitle').prop("innerText"),
            coofficeaddress: $('#officeAddress').prop("innerText"),
            priofficeaddress: "Singapore 117438",
            departuredate: departureDate,
            departuretime: departureTime,
            departuredatetime: departureDateTime,
            modeoftransport: $('#modeOfTransport').val(),
            coofficeduration: "",
            coofficedistance: "",
            coofficearrivaltime: null,
            primodeoftransport: "TRANSIT",
            priofficeduration: "",
            priofficedistance: ""
        };
                
        fetchMap();
        fetchWeatherData();
    }
    
    function giveRecommendation() {
        let request = {
            origin: { query: journey.originaddress },
            destination: { query: journey.priofficeaddress },
            travelMode: google.maps.TravelMode[journey.primodeoftransport.toUpperCase()],
            drivingOptions: {
                departureTime: journey.departuredatetime,
                trafficModel: 'bestguess'  // possible options: pessimistic, optimistic
            }
        };

        directionsService.route(request, function(result, status) {
            if (status === 'OK') {
    
                var route = result.routes[0]; // get the first (best) route
                journey.priofficedistance = route.legs[0].distance.text;
                journey.priofficeduration = route.legs[0].duration.text;                
                var timesaving = parseDuration(journey.priofficeduration) - parseDuration(journey.coofficeduration);
            
                console.log ("Time saving: " + timesaving + ", pri office duration: " + parseDuration(journey.priofficeduration) + ", co office duration: " + parseDuration(journey.coofficeduration));
                
                if (timesaving > 0) {
                    $('#recommendation-row').removeClass('hidden');
                    $('#recommendation').html("Good choice! Save <b>" + timesaving + " mins</b> on your commute by choosing the coworking office at <b>" + journey.coofficename + "</b> instead of your primary office.");
                
                    if (journey.modeoftransport === "TRANSIT") {
                        var request1 = {
                            origin: { query: journey.originaddress },
                            destination: { query: journey.coofficeaddress },
                            travelMode: "BICYCLING",
                            drivingOptions: {
                                departureTime: journey.departuredatetime,
                                trafficModel: 'bestguess'
                            }
                        };

                        directionsService.route(request1, function(result1, status1) {
                            if (status1 === 'OK') {
                                var route1 = result1.routes[0]; // get the first (best) route
                                var cyclingdistance = route1.legs[0].distance.text;
                                var cyclingduration = route1.legs[0].duration.text;

                                var tmp = $('#recommendation').html();
                                $('#recommendation').html(tmp + " Consider cycling (<b>" + cyclingduration + "</b>, <b>" + cyclingdistance + "</b>) instead of taking bus/MRT (<b>" + journey.coofficeduration + "</b>, <b>" + journey.coofficedistance + "</b>) to stay active as well.");
                            }
                        });
                    }                  
                } else   
                    $('#recommendation-row').addClass('hidden');
            } else
                alert('Failed to get primary office direction from Google Map. Please try again.');
        }); 
    }

    // fetch route based on origin address, destination address, departure date/time and mode of transport
    function fetchMap() {     
        
        let request = {
            origin: { query: journey.originaddress },
            destination: { query: journey.coofficeaddress },
            travelMode: google.maps.TravelMode[journey.modeoftransport.toUpperCase()],
            drivingOptions: {
                departureTime: journey.departuredatetime,
                trafficModel: 'bestguess'
            }
        };

        directionsService.route(request, function(result, status) {
            if (status === 'OK') {
                directionsRenderer.setDirections(result);

                // extract route information
                var route = result.routes[0]; // get the first (best) route
                $('#distance').val(route.legs[0].distance.text);
                $('#duration').val(route.legs[0].duration.text);
                
                var arrivalDateTime = new Date(journey.departuredatetime.getTime()); // clone the date object
                arrivalDateTime.setMinutes(arrivalDateTime.getMinutes() + parseDuration(route.legs[0].duration.text));

                journey.coofficeduration = route.legs[0].duration.text;
                journey.coofficedistance = route.legs[0].distance.text;
                journey.coofficearrivaltime = arrivalDateTime;

                // format the arrival time in hh:mm am/pm
                var options = {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: 'numeric', 
                    minute: 'numeric', 
                    hour12: true
                };
                
                $('#estimatedArrivalTime').val(arrivalDateTime.toLocaleString('en-GB', options).replace(',', '')); 
          
                giveRecommendation();
            } else
                alert('Failed to get directions from Google Map. Please try again.');
        });
    }

    // parse the duration string, e.g. 10 mins, to return duration in minutes
    function parseDuration(durationStr) {
        const regex = /(\d+)\s*(hour|hours|h|min|mins|minutes|m)/gi; // regex to match hours and minutes
        let totalMinutes = 0;
      
        // match all occurrences of hours and minutes
        let match;
        while ((match = regex.exec(durationStr)) !== null) {
            const value = parseInt(match[1], 10); // get the numeric value
            const unit = match[2].toLowerCase(); // get the unit (hour/min)
      
            if (unit.startsWith('hour')) {
                totalMinutes += value * 60; // convert hours to minutes
            } else if (unit.startsWith('min')) {
                totalMinutes += value; // just add the minutes
            }
        }
      
        return totalMinutes; // return total minutes
    }  

    // fetch weather data from NEA weather API and filter by date & time
    function fetchWeatherData() {
        var userSelectedDate = journey.departuredate + "T" + journey.departuretime + ":00";
        
        var apiUrl = `https://api-open.data.gov.sg/v2/real-time/api/twenty-four-hr-forecast?date=${encodeURIComponent(userSelectedDate)}`;

        axios.get(apiUrl)
            .then(response => {
                // handle successful response, accessing specific data from the response
                var forecast = response.data.data.records[0];
              
                $('#temperature').text(forecast.general.temperature.low + " - " + forecast.general.temperature.high + "°C");
                $('#weatherperiod').text("NEA forecast: " + forecast.general.validPeriod.text);

                var periods = forecast.periods;
                var userDate = new Date(userSelectedDate);
                var found = false;

                for (i = 0; i < periods.length && !found; i++) {    
                    var startDateTime = new Date(periods[i].timePeriod.start);
                    var endDateTime = new Date(periods[i].timePeriod.end);
            
                    if (userDate >= startDateTime && userDate <= endDateTime) {
                        $('#weather').text(periods[i].regions.central.text);
                        $('#weatherimg').attr("src", getWeatherIcon(periods[i].regions.central.text));
                        found = true;
                    }
                }    
            })
            .catch(error => {
                // Handle error here
                if (error.response) {
                    console.error('Error Status Code:', error.response.status);
                    console.error('Error Response Data:', error.response.data);
                    console.error('Return Code:', error.response.data.code);
                } else if (error.request) {
                    console.error('No response received:', error.request);
                } else {
                    console.error('Error:', error);
                }
            });
    }

    // get weather icon to display based on forecast returned by NEA API
    function getWeatherIcon (forecast) {
    
        let img = "";

        switch (forecast) {
            case "Fair": img = "fair-day"; break;
            case "Fair (Day)": img = "fair-day"; break;
            case "Fair (Night)": img = "fair-night"; break;
            case "Fair and Warm": img = "fair-warm"; break;
            case "Partly Cloudy": img = "partly-cloudy-day"; break;
            case "Partly Cloudy (Day)": img = "partly-cloudy-day"; break;
            case "Partly Cloudy (Night)": img = "partly-cloudy-night"; break;
            case "Cloudy": img = "cloudy"; break;
            case "Hazy": img = "hazy"; break;
            case "Slightly Hazy": img = "hazy"; break;
            case "Windy": img = "windy"; break;
            case "Mist": img = "mist"; break;
            case "Fog": img = "fog"; break;
            case "Light Rain": img = "light-rain"; break;
            case "Moderate Rain": img = "moderate-rain"; break;
            case "Heavy Rain": img = "heavy-rain"; break;
            case "Passing Showers": img = "passing-showers"; break;
            case "Light Showers": img = "light-rain"; break;
            case "Showers": img = "moderate-rain"; break;
            case "Heavy Showers": img = "heavy-rain"; break;
            case "Thundery Showers": img = "thundery-showers"; break;
            case "Heavy Thundery Showers": img = "heavy-thundery-showers"; break;  
            case "Heavy Thundery Showers with Gusty Winds": img = "heavy-thundery-showers"; break;
            default: img = "fair-day"; break;
        }

        return "images/" + img + ".gif";
    }
    
    // set handler for refreshLocationBtn 
    $('#refreshLocationBtn').click(refreshLocation);       
    
    // get or refresh location based on user's current location
    function refreshLocation() {
        // Get user's current location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                let latitude = position.coords.latitude;
                let longitude = position.coords.longitude;
      
                // Show address in 'CurrentLocation' input field
                geocoder.geocode({'location': {lat: latitude, lng: longitude}}, function(results, status) {
                    if (status === 'OK' && results[0]) {
                            $('#currentLocation').text(results[0].formatted_address);      
                            showMapandWeather();
                    }
                });
            });
        } else {
            alert('Geolocation is not supported by this browser.');
        }
    }


/*
    function fetchMap(originAddress, endAddress, departureDate, departureTime, modeOfTransport) {     
        var departureDateTime = new Date(`${departureDate}T${departureTime}`);

        let request = {
            origin: { query: originAddress },
            destination: { query: endAddress },
            travelMode: google.maps.TravelMode[modeOfTransport.toUpperCase()],
            drivingOptions: {
                departureTime: departureDateTime,
                trafficModel: 'bestguess'
            }
        };

        directionsService.route(request, function(result, status) {
            if (status === 'OK') {
                directionsRenderer.setDirections(result);

                // extract route information
                var route = result.routes[0]; // get the first (best) route
                $('#distance').val(route.legs[0].distance.text);
                $('#duration').val(route.legs[0].duration.text);

                var arrivalDateTime = new Date(departureDateTime.getTime()); // clone the date object
                arrivalDateTime.setMinutes(arrivalDateTime.getMinutes() + parseDuration(route.legs[0].duration.text));

                // format the arrival time in hh:mm am/pm
                var options = {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: 'numeric', 
                    minute: 'numeric', 
                    hour12: true
                };
                
                $('#estimatedArrivalTime').val(arrivalDateTime.toLocaleString('en-GB', options).replace(',', '')); 
                
                return { distanceText: route.legs[0].distance.text,
                         durationText: route.legs[0].duration.text,
            } else
                alert('Failed to get directions from Google Map. Please try again.');
        });
    }
*/

/* 
    function fetchWeatherData(date, time) {
        var userSelectedDate = date + "T" + time + ":00";
        
        var apiUrl = `https://api-open.data.gov.sg/v2/real-time/api/twenty-four-hr-forecast?date=${encodeURIComponent(userSelectedDate)}`;

        axios.get(apiUrl)
            .then(response => {
                // handle successful response, accessing specific data from the response
                var forecast = response.data.data.records[0];
              
                $('#temperature').text(forecast.general.temperature.low + " - " + forecast.general.temperature.high + "°C");
                $('#weatherperiod').text("NEA forecast: " + forecast.general.validPeriod.text);

                var periods = forecast.periods;
                var userDate = new Date(userSelectedDate);
                var found = false;

                for (i = 0; i < periods.length && !found; i++) {    
                    var startDateTime = new Date(periods[i].timePeriod.start);
                    var endDateTime = new Date(periods[i].timePeriod.end);
            
                    if (userDate >= startDateTime && userDate <= endDateTime) {
                        $('#weather').text(periods[i].regions.central.text);
                        $('#weatherimg').attr("src", getWeatherIcon(periods[i].regions.central.text));
                        found = true;
                    }
                }    
            })
            .catch(error => {
                // Handle error here
                if (error.response) {
                    console.error('Error Status Code:', error.response.status);
                    console.error('Error Response Data:', error.response.data);
                    console.error('Return Code:', error.response.data.code);
                } else if (error.request) {
                    console.error('No response received:', error.request);
                } else {
                    console.error('Error:', error);
                }
            });
    }
*/

});