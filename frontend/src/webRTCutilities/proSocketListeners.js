import updateCallStatus from "../redux-elements/actions/updateCallStatus";

const proDashboardSocketListeners = (socket, setAppInfo, dispatch) => {
  const appDataHandler = (apptData) => {
    console.log("Gelen data:", apptData);
    setAppInfo(apptData);
  };
  const offerHandler = (offerData) => {
    console.log("[PRO] newOfferWaiting event:", offerData);
    dispatch(updateCallStatus("offer", offerData.offer));
    dispatch(updateCallStatus("myRole", "answerer"));
  };

  socket.on("appData", appDataHandler);
  socket.on("newOfferWaiting", offerHandler);

  // CLEANUP
  return () => {
    socket.off("appData", appDataHandler);
    socket.off("newOfferWaiting", offerHandler);
  };
};

const proVideoSocketListeners = (socket, addIceCandidateToPc) => {
  const iceHandler = (iceC) => {
    addIceCandidateToPc(iceC);
  };

  socket.on("iceToClient", iceHandler);

  return () => {
    socket.off("iceToClient", iceHandler);
  };
};

export default { proDashboardSocketListeners, proVideoSocketListeners };
