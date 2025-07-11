//This is where we create the express and socket.io server
//-backend/server.js
const fs = require("fs"); //the file system
const https = require("https");
const cors = require("cors");
const express = require("express");
const socketio = require("socket.io");
const app = express();

app.use(express.static(__dirname + "/public"));
app.use(cors()); //this will open our Express API to ANY domain for now.
app.use(express.json()); //this will allow us to parse json in the body with the body parser

const key = fs.readFileSync("./certs/cert.key");
const cert = fs.readFileSync("./certs/cert.crt");

const expressServer = https.createServer({ key, cert }, app);
const io = socketio(expressServer, {
  cors: {
    origin: ["https://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

expressServer.listen(9000);
module.exports = { io, expressServer, app };
