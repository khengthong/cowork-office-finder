$(document).ready(function() {
    let map;
    let marker;
    let geocoder = new google.maps.Geocoder();
    let offices = [];
    let currentPage = 0; // Track the current page
    const itemsPerPage = 6; // Number of items to display per page

    // Initialize Google Map
    function initializeMap(latitude, longitude) {
        map = new google.maps.Map(document.getElementById('map'), {
            center: {lat: latitude, lng: longitude},
            zoom: 15
        });

        marker = new google.maps.Marker({
            position: {lat: latitude, lng: longitude},
            map: map,
            animation: google.maps.Animation.BOUNCE
        });
    }

    // Function to geocode address and show on map
    function showMap(address) {
        geocoder.geocode({'address': address}, function(results, status) {
            if (status === 'OK') {
                map.setCenter(results[0].geometry.location);
                marker.setPosition(results[0].geometry.location);
            } else {
                alert('Geocode was not successful for the following reason: ' + status);
            }
        });
    }

    $('#findOfficesBtn').click(loadOffices);
        
    function loadOffices() {
        let location = $('#currentLocation').val();
        
        $.ajax({
            url: '/findoffices',
            method: 'GET',
            data: { location: location },
            success: displayOffices,
            error: function() {
                alert('Failed to fetch offices data.');
            }
        });
    }

    function displayOffices(response) {
        // Assuming 'response' is an array of office objects
        offices = response; 

        // Calculate the total number of pages
        const totalPages = Math.ceil(offices.length / itemsPerPage);

        // Clear existing cards
        let columns = [$('#column1'), $('#column2'), $('#column3')];
        columns.forEach(column => column.empty());

        // Determine the start and end indices for the current page
        const startIndex = currentPage * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, offices.length);

        // Ensure we are not exceeding the available offices
        if (startIndex < offices.length) {
            // Add new cards for the current page
            let columnIndex = 0;
            for (let i = startIndex; i < endIndex; i++) {
                let office = offices[i];
                let utilizationPercentage = ((office.curr_cap / office.max_cap) * 100).toFixed(0);

                let card = $(`
                    <div class="card" data-title="${office.officename}" data-description="${office.agencyname}" data-address="${office.address}" data-image="/images/${office.photoname}" data-currcap="${office.curr_cap}" data-maxcap="${office.max_cap}">
                        <div class="card-body d-flex">
                            <img src="/images/${office.photoname}" alt="Office" class="card-img-left">
                            <div class="content flex-grow-1 mx-2">
                                <h6 class="card-title">${office.officename}</h6>
                                <p class="card-text1">${office.address}</p>
                                <p class="card-text2"><u>By Bus/MRT:</u><br>
                                                    Distance: ${office.distance}<br>
                                                    Duration: ${office.duration}</p>
                            </div>
                        </div>
                        <!-- Utilization Display -->
                        <div class="utilization-text">
                            <span>${utilizationPercentage}% occupied (${office.curr_cap}/${office.max_cap})</span>
                        </div>
                        <div class="utilization">
                            <div class="utilization-bar" style="width: ${((office.curr_cap / office.max_cap) * 100).toFixed(2)}%;"></div>
                        </div>
                    </div>
                `);

                columns[columnIndex].append(card);
                columnIndex = (columnIndex + 1) % columns.length; // Move to the next column
            }
        }
        // Optional: Logic to handle pagination buttons (Previous/Next)
        updatePaginationControls(totalPages);
    }

    // Function to handle pagination
    function changePage(increment) {
        currentPage += increment;
        displayOffices(offices);
    }

    // Function to update pagination controls
    function updatePaginationControls(totalPages) {
        // Ensure the pagination toggle is shown only after cards are presented
        $('#pagination').show(); // Show the pagination and sort toggle

        // Clear existing pagination controls
        $('#prevButton').hide(); // Hide buttons initially
        $('#nextButton').hide();

        // Show "Previous" button if not on the first page
        if (currentPage > 0) {
            $('#prevButton').show(); // Show the previous button
            $('#prevButton').off('click').on('click', function() {
                changePage(-1);
            });
        }

        // Show "Next" button if not on the last page
        if (currentPage < totalPages - 1) {
            $('#nextButton').show(); // Show the next button
            $('#nextButton').off('click').on('click', function() {
                changePage(1);
            });
        }
    }

    // Using jQuery to add the event handler
    $('#sortToggleSwitch').on('change', function() {
        handleSortToggle(this);
    });

    // Handler function for sort toggle
    function handleSortToggle(toggle) {
        const sortBy = toggle.checked ? "distance" : "duration";

        // Sort offices based on the selected criteria
        offices.sort((a, b) => {
            if (sortBy === "distance") {
                return a.distanceNo - b.distanceNo; // Ascending distance
            } else {
                return a.durationNo - b.durationNo; // Ascending duration
            }
        });

        // Refresh the displayed cards after sorting
        displayOffices(offices); // This function should re-render the cards based on sorted offices
    }

    $('#refreshLocationBtn').click(function() {
        let address = $('#currentLocation').val();
        showMap(address);
    });

    // Get user's current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            let latitude = position.coords.latitude;
            let longitude = position.coords.longitude;
            initializeMap(latitude, longitude);

            // Show address in 'CurrentLocation' input field
            geocoder.geocode({'location': {lat: latitude, lng: longitude}}, function(results, status) {
                if (status === 'OK') {
                    if (results[0]) {
                        $('#currentLocation').val(results[0].formatted_address);
                    }
                }
            });
        });
    } else {
        alert('Geolocation is not supported by this browser.');
    }

    $(document).on('click', '.card', function() {
        let title = $(this).data('title');
        let description = $(this).data('description');
        let address = $(this).data('address');
        let image = $(this).data('image');
        let currcap = $(this).data('currcap');
        let maxcap = $(this).data('maxcap');
        let currentLocation = $('#currentLocation').val();

        // Create a form dynamically and submit it using POST method
        let form = $('<form>', {
            action: 'office',
            method: 'post'
        }).append($('<input>', {
            type: 'hidden',
            name: 'currentLocation',
            value: currentLocation
        })).append($('<input>', {
            type: 'hidden',
            name: 'title',
            value: title
        })).append($('<input>', {
            type: 'hidden',
            name: 'description',
            value: description
        })).append($('<input>', {
            type: 'hidden',
            name: 'address',
            value: address
        })).append($('<input>', {
            type: 'hidden',
            name: 'image',
            value: image
        })).append($('<input>', {
            type: 'hidden',
            name: 'currcap',
            value: currcap
        })).append($('<input>', {
            type: 'hidden',
            name: 'maxcap',
            value: maxcap
        }));

        $('body').append(form);
        form.submit();
    });
});