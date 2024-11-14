import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import dotenv from "dotenv";
import pg from "pg";
import { dirname } from "path";
import { fileURLToPath } from "url";

import passport from "passport";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";

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
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(passport.initialize());
app.use(passport.session());

/* declaring app specific variables and fetch offices data */
let offices = [];
let offices_and_distance = [];
getOffices ();

let authenticated_user = {id: null,
                          email: "",
                          password: "",
                          name: "",
                          homeaddress: "",
                          priofficename: "",
                          priofficeaddress: "",
                          primodeoftransport: ""
};

/* handle HTTP Req: GET / */
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/handleauth",
  passport.authenticate("google", {
    successRedirect: "/confirm",
    failureRedirect: "/",
  })
);

app.get("/confirm", async (req, res) => {
  console.log ("In /confirm");

  if (req.isAuthenticated()) {
    try {
      const results = await db.query(
        `SELECT * FROM users WHERE email = $1`,
        [req.user.email]
      );
    
      const { id, email, password, name, homeaddress, priofficename, priofficeaddress, primodeoftransport } = results.rows[0];

      authenticated_user.id = id;
      authenticated_user.email = email;
      authenticated_user.password = password;
      authenticated_user.name = name;
      authenticated_user.homeaddress = homeaddress;
      authenticated_user.priofficename = priofficename;
      authenticated_user.priofficeaddress = priofficeaddress;
      authenticated_user.primodeoftransport = primodeoftransport;

      res.render("userprofile.ejs", { id, email, password, name, homeaddress, priofficename, priofficeaddress, primodeoftransport });
    } catch (err) {
      console.log(err);
      var errormessage = "Oops, error in accessing database. Please try again.";
      res.render("error.ejs", { errormessage });
    }
  } else {
    var errormessage = "Oops, error in authentication. Please try again.";
    res.render("error.ejs", { errormessage });
  }
});

app.post("/saveprofile", async (req, res) => {
   if (req.isAuthenticated()) {
    try {
      var a = req.body;  
      console.log ("/saveprofile req.user.id: " + req.user.id);

      const newUser = await db.query(
          "UPDATE users SET homeaddress = $1, priofficename = $2, priofficeaddress = $3, primodeoftransport = $4 WHERE id = $5",
          [a.homeaddress, a.priofficename, a.priofficeaddress, a.primodeoftransport, req.user.id]
        );

      authenticated_user.id = req.user.id;
      authenticated_user.homeaddress = a.homeaddress;
      authenticated_user.priofficename = a.priofficename;
      authenticated_user.priofficeaddress = a.priofficeaddress;
      authenticated_user.primodeoftransport = a.primodeoftransport;

      res.render("start.ejs");
    } catch (err) {
      console.log(err);
      var errormessage = "Oops, error in updating database. Please try again.";
      res.render("error.ejs", { errormessage });
    }
  } else {
    res.redirect("/");
  }
});

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      userProfileURL: process.env.GOOGLE_USER_PROFILE_URL,
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        console.log ("In GoogleStrategy - email: " + profile.email);

        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          profile.email,
        ]);
        if (result.rows.length === 0) {
            const newUser = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [profile.email, "google"]
          );

          console.log ("In GoogleStrategy - newUser: " + newUser.rows[0]);

          return cb(null, newUser.rows[0]);                                                 
        } else {
          return cb(null, result.rows[0]);
        }
      } catch (err) {
        console.log ("Except in insert user " + err);
        return cb(err);
      }
    }
  )
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});


/* handle HTTP Req: GET /start */
app.get("/start", (req, res) => {
  res.render("start.ejs");
});

/* handle HTTP Req: GET /findoffices */
app.get("/findoffices", async (req, res) => {
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
      var errormessage = "Oops, error in fetching distance information. Please try again.";
      res.render("error.ejs", { errormessage });
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

  var priofficename = "";
  var priofficeaddress = "";
  var primodeoftransport = "";

  if (req.isAuthenticated()) {
    priofficename = authenticated_user.priofficename;
    priofficeaddress = authenticated_user.priofficeaddress;
    primodeoftransport = authenticated_user.primodeoftransport;
  }
  
  res.render("office.ejs", {currentLocation, title, description, address, image, currcap, maxcap, priofficename, priofficeaddress, primodeoftransport});
});

/* starting the server-side nodejs app */
app.listen(port, () => {
  console.log(`Coworking Office Finder app running on port ${port}`);
});

/* fetching offices data from DB */
function getOffices () {

  db.query("select * from offices", (err, res) => {
    if (err) {
      console.error ("Error executing query", err.stack);
    } else {
      offices = res.rows;
    }
  });
}