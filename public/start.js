$(document).ready(function() {
    let map;
    let marker;
    let geocoder = new google.maps.Geocoder();
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
            success: function(response) {
                // Assuming 'response' is an array of office objects
                let offices = response; 
    
                // Calculate the total number of pages
                const totalPages = Math.ceil(offices.length / itemsPerPage);
    
                console.log ("Total Pages: " + totalPages);

                // Clear existing cards
                let columns = [$('#column1'), $('#column2'), $('#column3')];
                columns.forEach(column => column.empty());
    
                // Determine the start and end indices for the current page
                const startIndex = currentPage * itemsPerPage;
                const endIndex = Math.min(startIndex + itemsPerPage, offices.length);
    
                console.log ("Start Index: " + startIndex + "End Index: " + endIndex);

                // Ensure we are not exceeding the available offices
                if (startIndex < offices.length) {
                    // Add new cards for the current page
                    let columnIndex = 0;
                    for (let i = startIndex; i < endIndex; i++) {
                        let office = offices[i];
                        let card = $(`
                            <div class="card" data-title="${office.officename}" data-description="${office.agencyname}" data-address="${office.address}" data-image="/images/${office.photoname}" data-currcap="${office.curr_cap}" data-maxcap="${office.max_cap}">
                                <div class="card-body">
                                    <img src="/images/${office.photoname}" alt="Office">
                                    <div class="content">
                                        <h6 class="card-title">${office.officename}</h6>
                                        <p class="card-text">${office.address}</p>
    
                                        <!-- Utilization Display -->
                                        <div class="utilization">
                                            <div class="utilization-bar" style="width: ${((office.curr_cap / office.max_cap) * 100).toFixed(2)}%;"></div>
                                        </div>
                                        <div class="utilization-text">
                                            <span>${office.curr_cap} / ${office.max_cap} occupied</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `);
                    
                        columns[columnIndex].append(card);
                        columnIndex = (columnIndex + 1) % columns.length; // Move to the next column
                    }
                }
                
                // Optional: Logic to handle pagination buttons (Previous/Next)
                updatePaginationControls(totalPages);
    
            },
            error: function() {
                alert('Failed to fetch offices data.');
            }
        });
    }

    // Function to handle pagination
    function changePage(increment) {
        currentPage += increment;
        loadOffices();
    }

    // Function to update pagination controls
    function updatePaginationControls(totalPages) {
        $('#pagination').empty(); // Clear existing pagination controls

        // Create and append the "Previous" button if not on the first page
        if (currentPage > 0) {
            $('#pagination').append('<button id="prevButton" class="btn" style="background-color: magenta;">Prev</button>');
            $('#prevButton').on('click', function() {
                changePage(-1);
            });
        }

        // Create and append the "Next" button if not on the last page
        if (currentPage < totalPages - 1) {
            $('#pagination').append('<button id="nextButton" class="btn" style="background-color: magenta;">Next</button>');
            $('#nextButton').on('click', function() {
                changePage(1);
            });
        }
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



/*

$('#addCardBtn').click(function() {
    let column = $('#columnSelect').val();
    let card = $(`
        <div class="card" data-title="Office Title" data-description="Brief description of the office." data-address="1234 Office Address, City" data-image="https://via.placeholder.com/100">
            <div class="card-body">
                <img src="https://via.placeholder.com/100" alt="Office">
                <div class="content">
                    <h5 class="card-title">Office Title</h5>
                    <p class="card-text">Brief description of the office.</p>
                    <p class="card-text">1234 Office Address, City</p>
                </div>
            </div>
        </div>
    `);
    $('#column' + column).append(card);
});

$('#deleteCardBtn').click(function() {
    let column = $('#columnSelect').val();
    $('#column' + column + ' .card').last().remove();
});

*/

/*

$(document).ready(function() {
    $('#addCardBtn').click(function() {
        let column = $('#columnSelect').val();
        let card = $(`
            <div class="card" data-title="Office Title" data-description="Brief description of the office." data-address="1234 Office Address, City" data-image="https://via.placeholder.com/100">
                <div class="card-body">
                    <img src="https://via.placeholder.com/100" alt="Office">
                    <div class="content">
                        <h5 class="card-title">Office Title</h5>
                        <p class="card-text">Brief description of the office.</p>
                        <p class="card-text">1234 Office Address, City</p>
                    </div>
                </div>
            </div>
        `);
        $('#column' + column).append(card);
    });

    $('#deleteCardBtn').click(function() {
        let column = $('#columnSelect').val();
        $('#column' + column + ' .card').last().remove();
    });

    $('#refreshLocationBtn').click(function() {
        let location = $('#currentLocation').val();

    });

    $('#findOfficesBtn').click(function() {
        let location = $('#currentLocation').val();
       // alert('Finding offices near ' + location + '...');
        // Add your location-based office search functionality here
    });

    // Function to show Google Map with user's current location
    function showMap(latitude, longitude) {
        let map = new google.maps.Map(document.getElementById('map'), {
            center: {lat: latitude, lng: longitude},
            zoom: 15
        });

        let marker = new google.maps.Marker({
            position: {lat: latitude, lng: longitude},
            map: map,
            animation: google.maps.Animation.BOUNCE
        });

        // Show address in 'CurrentLocation' input field
        let geocoder = new google.maps.Geocoder();
        geocoder.geocode({'location': {lat: latitude, lng: longitude}}, function(results, status) {
            if (status === 'OK') {
                if (results[0]) {
                    $('#currentLocation').val(results[0].formatted_address);
                }
            }
        });
    }

    // Get user's current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            let latitude = position.coords.latitude;
            let longitude = position.coords.longitude;
            showMap(latitude, longitude);
        });
    } else {
        alert('Geolocation is not supported by this browser.');
    }

    $(document).on('click', '.card', function() {
        let title = $(this).data('title');
        let description = $(this).data('description');
        let address = $(this).data('address');
        let image = $(this).data('image');
        let currentLocation = $('#currentLocation').val();

        // alert (title + ", " + description + ", " + address + ", " + image + ", " + currentLocation);

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
        }));

        // alert (form);

        $('body').append(form);
        form.submit();
    });
});

*/