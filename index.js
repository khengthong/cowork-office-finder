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
app.get("/findoffices", (req, res) => {
  console.log ("Location: " + req.query.location);
  res.json(offices);
});

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

  //    for (let i = 0; i < offices.length; i++)
  //      console.log("Office Name: " + offices[i].officename + "Image: " + offices[i].photoname);
    }

    //db.end();
  });
}



/*
app.post('/route', async (req, res) => {
  const { origin, destination, mode } = req.body;

  const googleMapsKey = process.env.GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=${mode}&key=${googleMapsKey}`;

  try {
    const response = await axios.get(url);
    res.json(response.data);
    console.log (response.data);
  } catch (error) {
    res.status(500).send('Error fetching directions');
  }
});*/