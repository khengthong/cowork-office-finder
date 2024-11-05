import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import { dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(bodyParser.json());

app.get("/", (req, res) => {
    res.render("index.ejs");
});

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
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});




/* old codes

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
}); */
