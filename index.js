import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import dotenv from "dotenv";
import pg from "pg";
import { dirname } from "path";
import { fileURLToPath } from "url";

/* reading config in .env file */
dotenv.config();

/* setting up some app resources */
const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT;
const googlemapsapikey = process.env.GOOGLE_MAPS_API_KEY; // Store your API key in .env file

/* setting up and connecting to postgress db */
const db = new pg.Client({
  user: process.env.pguser,
  host: process.env.pghost,
  database: process.env.pgdatabase,
  password: process.env.pgpassword,
  port: process.env.pgport
});

db.connect();

/* setting up express middleware */
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

/* declaring app specific variables and fetch offices data */
let offices = [];
let offices_and_distance = [];
getOffices ();


/* handle HTTP Req: GET / */
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

/* handle HTTP Req: GET /start */
app.get("/start", (req, res) => {
    res.render("start.ejs");
//  res.render("test.ejs");
});

/* handle HTTP Req: GET /findoffices */
app.get("/findoffices", async (req, res) => {
  console.log ("Location: " + req.query.location);

  // Prepare origin address and destination addresses from office records
  const currentLocation = req.query.location;
  const destinations = offices.map(office => office.address).join('|'); // Join destinations with '|'

  // Construct the API URL
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(currentLocation)}&destinations=${encodeURIComponent(destinations)}&mode=transit&key=${googlemapsapikey}`;

  try {
      const response = await axios.get(url);
      const results = response.data;

      if (results.rows.length > 0) {
        
        offices_and_distance = [];

          results.rows[0].elements.forEach((element, i) => {
              if (element.status === "OK") {
                var distanceStr = element.distance ? element.distance.text : null;
                var durationStr = element.duration ? element.duration.text : null;

                offices_and_distance.push({
                      ...offices[i], // Spread office data
                      distance: distanceStr,
                      distanceNo: parseFloat(distanceStr ? distanceStr.replace(' km', '').trim() : "0"),
                      duration: durationStr,
                      durationNo: durationStr ? parseDuration(durationStr) : 0,
                  });
              } else {
                  console.error(`Error for destination ${offices[i].address}: ${element.status}`);
              }
          });
      }
  } catch (err) {
      console.error('Error fetching distances:', err);
  }

  res.json(sortOffices(offices_and_distance, 'distanceNo'));
});

function parseDuration(durationStr) {
  const regex = /(\d+)\s*(hour|hours|h|min|mins|minutes|m)/gi; // Regex to match hours and minutes
  let totalMinutes = 0;

  // Match all occurrences of hours and minutes
  let match;
  while ((match = regex.exec(durationStr)) !== null) {
      const value = parseInt(match[1], 10); // Get the numeric value
      const unit = match[2].toLowerCase(); // Get the unit (hour/min)

      if (unit.startsWith('hour')) {
          totalMinutes += value * 60; // Convert hours to minutes
      } else if (unit.startsWith('min')) {
          totalMinutes += value; // Just add the minutes
      }
  }

  return totalMinutes; // Return total minutes
}

// Function to sort offices by a specified field 
function sortOffices(inputarray, field) { 
  return inputarray.sort((a, b) => { 
    if (a[field] < b[field]) return -1; 
    if (a[field] > b[field]) return 1; 
    return 0; 
  }); 
} 

/* handle HTTP Req: POST /office */
app.post("/office", (req, res) => {
  const { currentLocation, title, description, address, image, currcap, maxcap } = req.body;
  res.render("office.ejs", {currentLocation, title, description, address, image, currcap, maxcap});
});

/* starting the server-side nodejs app */
app.listen(port, () => {
  console.log(`Co-work Office Finder app running on port ${port}`);
});

/* fetching offices data from DB */
function getOffices () {

  db.query("select * from offices", (err, res) => {
    if (err) {
      console.error ("Error executing query", err.stack);
    } else {
      offices = res.rows;
      console.log ("Row count: " + offices.length);
    }
  });
}