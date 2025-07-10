import updateCallStatus from "../redux-elements/actions/updateCallStatus";

const proSocketListeners = (socket, setAppInfo, dispatch) => {
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

export default proSocketListeners;
