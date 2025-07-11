//all our socketServer stuff happens here
//-backend/socketServer.js
require("dotenv").config();
const { io } = require("./server"); //fetching the io from server
const app = require("./server").app; //fetching the app from server
const jwt = require("jsonwebtoken");
const secretKey = process.env.SECRET_KEY;

const connectedProfessionals = [];
const connectedClients = [];

const allKnownOffers = {
  //uniqueId - key
  //offer
  //professialsFullName
  //clientName
  //apptDate
  //offererIceCandidates
  //answer
  //answerIceCandidates
};

io.on("connection", (socket) => {
  console.log("[BACKEND] Yeni bağlantı:", socket.id);

  //console.log(offer); görüntüleyemiyorum
  const handshakeData = socket.handshake.auth.jwt;
  let decodedData;

  try {
    decodedData = jwt.verify(handshakeData, secretKey);
  } catch (error) {
    console.log(error);
    //THESE AREN'T THE DROIDS WE ARE LOOKING FOR.
    socket.disconnect();
    return;
  }

  const { fullName, proId } = decodedData;

  if (proId) {
    //this is prof. Update/add to connected professionals
    const connectedPro = connectedProfessionals.find(
      (cp) => cp.proId === proId
    );

    if (connectedPro) {
      connectedPro.socketId = socket.id;
    } else {
      connectedProfessionals.push({
        socketId: socket.id,
        fullName: fullName, //şimdilik undefined olacak
        proId,
      });
    }
    //send the appt data out to the professional
    //bunu axios veya httprequest ile yapabiliriz, burda listener ile yapıyoruz
    const professionalAppointments = app.get("professionalAppointments");
    socket.emit(
      "appData",
      professionalAppointments.filter(
        (pa) => pa.professionalsFullName === fullName
      )
    );

    //loop through all known offers and send out to the profs that just joined
    //the ones that belong to him/her
    for (const key in allKnownOffers) {
      if (allKnownOffers[key].professionalsFullName === fullName) {
        //this offer is for this pro
        io.to(socket.id).emit("newOfferWaiting", allKnownOffers[key]);
      }
    }
  } else {
    //this is a client
    const { professionalsFullName, uuid, clientName } = decodedData;
    connectedClients.push({
      clientName,
      uuid,
      professionalMeetingWith: professionalsFullName,
    });
    //check to see if the client is already in the array
    //why? could have reconnected
    const clientExist = connectedClients.find((c) => c.uuid == uuid);
    if (clientExist) {
      //already connected. just update the id
      clientExist.socketId = socket.id;
    } else {
      //add them
      connectedClients.push({
        clientName,
        uuid,
        professionalMeetingWith: professionalsFullName,
        socketId: socket.id,
      });
    }
    const offerForThisClient = allKnownOffers[uuid];
    if (offerForThisClient) {
      io.to(socket.id).emit("answerToClient", offerForThisClient.answer);
    }
  }
  //önceden bağlantı var mıydı kontrolü
  //reconnected durumu

  console.log(connectedProfessionals);

  socket.on("newAnswer", ({ answer, uuid }) => {
    console.log("[BACKEND] newAnswer alındı:", { answer, uuid });

    // console.log(answer);
    // console.log(uuid);
    //BUNLARIN OUTPUTUNU DA ALAMIYORUM, BACKEND SERVERINE EMIT EDILIRKEN BIR PROBLEM OLUYOR UI TARAFINDA
    const socketToSendTo = connectedClients.find((c) => c.uuid == uuid);
    if (socketToSendTo) {
      socket.to(socketToSendTo.socketId).emit("answerToClient", answer);
    }

    //update the offer
    const knownOffer = allKnownOffers[uuid];
    if (knownOffer) {
      knownOffer.answer = answer;
    }
  });

  socket.on("newOffer", ({ offer, apptInfo }) => {
    console.log("[SOCKET] newOffer alındı:", offer, apptInfo);
    //offer = sdp/type, apptInfo has the uuid that we can add to allKnownOffers
    //so that, the professional can find exactly the right allKnownOffers
    allKnownOffers[apptInfo.uuid] = {
      ...apptInfo,
      offer,
      offererIceCandidates: [],
      answer: null,
      answerIceCandidates: [],
    };

    //we don't emit this to everyone like we did our chat server
    //we only want this to go to our professional

    //we got professionalApponitments from express (that's where its made)
    const professionalAppointments = app.get("professionalAppointments");
    //this find particular appt so we can update that the user is waiting has sent us an offer
    const pa = professionalAppointments.find((pa) => pa.uuid === apptInfo.uuid);
    if (pa) {
      pa.waiting = true;
      console.log("[SOCKET SERVER] pa.waiting set edildi", pa);
    }

    //find this particular professional so we can emit
    const p = connectedProfessionals.find(
      (cp) => cp.fullName === apptInfo.professionalsFullName
    );
    if (p) {
      //only emit if the professional is committed
      const socketId = p.socketId;

      //send the new offer over
      socket
        .to(socketId)
        .emit("newOfferWaiting", allKnownOffers[apptInfo.uuid]); //yukarıdaki {fullName, proId} olmadıgından [appInfo da var }]
      console.log("[SOCKET] newOfferWaiting emit edildi, proId:", socketId);

      //send the updated appt info with the new waiting
      socket.to(socketId).emit(
        "appData",
        professionalAppointments.filter(
          (pa) => pa.professionalsFullName === apptInfo.professionalsFullName
        )
      );
    }
  });

  socket.on("getIce", (uuid, who, ackFunc) => {
    const offer = allKnownOffers[uuid];
    let iceCandidates = [];
    if (!offer) {
      // OFFER YOKSA backend'i asla patlatma! Boş array döndür.
      ackFunc([]);
      return;
    }
    if (who === "professional") {
      iceCandidates = offer.offererIceCandidates || [];
    } else if (who === "client") {
      iceCandidates = offer.answerIceCandidates || [];
    }
    ackFunc(iceCandidates);
  });

  //socketio başka birinin asenkron sorunlarını asenkron olarak incelediğinden tam bir nightmare'a dönüşüyor buralar, iceCandidate en beteri
  socket.on("iceToServer", ({ who, iceC, uuid }) => {
    console.log("[BACKEND] iceToServer geldi:", { who, iceC, uuid });

    // console.log(who);
    // console.log(iceC);
    // console.log(uuid);
    const offerToUpdate = allKnownOffers[uuid];
    const socketToSendTo = connectedProfessionals.find(
      (cp) => cp.fullName === decodedData.professionalsFullName
    );
    if (socketToSendTo) {
      socket.to(socketToSendTo.socketId).emit("iceToClient", iceC);
    }
    if (offerToUpdate) {
      if (who === "client") {
        //this eans the client has sent up an iceC
        //update the offer
        offerToUpdate.offererIceCandidates.push(iceC);
        const socketToSendTo = connectedProfessionals.find(
          (cp) => cp.fullName === decodedData.professionalsFullName
        );
        if (socketToSendTo) {
          socket.to(socketToSendTo.socketId).emit("iceToClient", iceC);
        }
      } else if (who === "professional") {
        offerToUpdate.answerIceCandidates.push(iceC);
        const socketToSendTo = connectedClients.find((cp) => cp.uuid == uuid);
        if (socketToSendTo) {
          socket.to(socketToSendTo.socketId).emit("iceToClient", iceC);
        }
      }
    }
  });
});
