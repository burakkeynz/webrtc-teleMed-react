import updateCallStatus from "../redux-elements/actions/updateCallStatus";

const proDashboardSocketListeners = (socket, setAppInfo, dispatch) => {
  socket.on("appData", (apptData) => {
    console.log(apptData, setAppInfo);
    setAppInfo(apptData);
  });

  socket.on("newOfferWaiting", (offerData) => {
    //disppatch the offer to redux so that it is available for later
    dispatch(updateCallStatus("offer", offerData.offer));
    dispatch(updateCallStatus("myRole", "answerer"));
  });
};

const proVideoSocketListeners = (socket, addIceCandidateToPc) => {
  socket.on("iceToClient", (iceC) => {
    addIceCandidateToPc(iceC);
  });
};

export default { proDashboardSocketListeners, proVideoSocketListeners };
