import { io } from "socket.io-client";

let socket;
const socketConnection = (jwt) => {
  if (socket && socket.connected) {
    return socket;
  }
  socket = io("https://localhost:9000", {
    secure: true,
    transports: ["websocket"],
    rejectUnauthorized: false,
    auth: { jwt: jwt },
  });
  return socket;
};
export default socketConnection;
