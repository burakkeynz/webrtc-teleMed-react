import updateCallStatus from "../redux-elements/actions/updateCallStatus";

const clientSocketListener = (socket, dispatch, addIceCandidateToPc) => {
  // Handler fonksiyonlarını değişkene ata!
  const answerHandler = (answer) => {
    console.log("[CLIENT] answerToClient EVENT:", answer);
    dispatch(updateCallStatus("answer", answer));
    dispatch(updateCallStatus("myRole", "offerer"));
  };

  const iceHandler = (iceC) => {
    addIceCandidateToPc(iceC);
  };

  socket.on("answerToClient", answerHandler);
  socket.on("iceToClient", iceHandler);

  return () => {
    socket.off("answerToClient", answerHandler);
    socket.off("iceToClient", iceHandler);
  };
};

export default clientSocketListener;
