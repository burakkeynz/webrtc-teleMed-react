//This is where all our Express (routes) happens
//-backend/expressRoutes.js
require("dotenv").config();
const { app } = require("./server");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid"); //uuid TS'siz modül eklenmesi

// console.log(uuidv4()); //d196621d-8cf7-4f51-9b7a-43116dc9a8aa gibi

const secretKey = process.env.SECRET_KEY;

//Normalde bu arr  kalıcı bir data olmalı, db, api, file etc.
const professionalAppointments = [
  {
    professionalsFullName: "Ufuk Karacalı, U.K.",
    apptDate: Date.now() + 500000,
    uuid: 1,
    clientName: "Mehmet Mert Ozbaykus, M.M.O",
  },
  {
    professionalsFullName: "Ufuk Karacalı, U.K.",
    apptDate: Date.now() - 2000000,
    uuid: 2, // uuid:uuidv4(),
    clientName: "Burak Ege Kaya, B.E.K",
  },
  {
    professionalsFullName: "Ufuk Karacalı, U.K.",
    apptDate: Date.now() + 10000000,
    uuid: 3, //uuid:uuidv4(),
    clientName: "Berkay Kepekci, B.K",
  },
];

app.set("professionalAppointments", professionalAppointments);

//Şimdilik bir link üzerinden authentication olmadan tıklayıp görüntülü sohbete katılan bir rotue yapıyorum, projede bu yapı authentication ile birlikte kontrol edilecek
//For demo/production phase, a receptionist, or calender/scheduiling would send this out. we will print it out and paste it in. It will drop us on our Reat site with the right info for CLIENT1 to make an offer
app.get("/user-link", (req, res) => {
  // const uuid = uuidv4(); //for unique id, pk, React key atamalarında çakışma olmaması adına iyi
  // //data for the end-user's appt
  const appointmentData = professionalAppointments[0];

  professionalAppointments.push(appointmentData);
  //We need to encode this data in token, şimdilik bu projede JWT.io kullanacağım, HTTPS-cookie kısmında da JWT gibi payload eklemeyi ama cookie ile saklamayı düşünüyorum
  const token = jwt.sign(appointmentData, secretKey);
  res.send(`https://localhost:3000/join-video?token=${token}`);
});

app.post("/validate-link", (req, res) => {
  //GET the token from the body of the post request
  const token = req.body.token;
  //decode the jwt with secret key
  const decodedData = jwt.verify(token, secretKey);
  //send decoded data back to the frontend
  res.json(decodedData);
});

app.get("/pro-link", (req, res) => {
  const randomPro =
    professionalAppointments[
      Math.floor(Math.random() * professionalAppointments.length)
    ];
  const userData = {
    fullName: randomPro.professionalsFullName,
    proId: randomPro.uuid,
  };
  const token = jwt.sign(userData, secretKey);
  res.send(
    `<a href="https://localhost:3000/dashboard?token=${token}" target="_blank" >Link Here</a>`
  );
});
