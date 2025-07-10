import { io } from "socket.io-client";

//tekrar tekrar socket bağlantısı yapmak istemiyorum, o yüzden burda socket global şekilde tanımlanıyor eğer önceden bağlantı varsa direkt o socket returnleniyor
let socket;
const socketConnection = (jwt) => {
  if (socket && socket.connected) {
    return socket;
  } else {
    socket = io.connect("https://localhost:9000", {
      secure: true,
      transports: ["websocket"],
      rejectUnauthorized: false,
      auth: { jwt: jwt },
    });
    return socket;
  }
};
export default socketConnection;
