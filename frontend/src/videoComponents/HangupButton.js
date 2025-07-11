import { useDispatch, useSelector } from "react-redux";
import updateCallStatus from "../redux-elements/actions/updateCallStatus";
import { globalStreams } from "../webRTCutilities/globalStreams";

const HangupButton = ({ largeFeedEL, smallFeedEl }) => {
  const dispatch = useDispatch();
  const callStatus = useSelector((state) => state.callStatus);
  const streams = useSelector((state) => state.streams);

  const hangupCall = () => {
    dispatch(updateCallStatus("current", "complete"));

    // Store'daki her stream'in peerConnection'unu globalStreams'ten bul ve kapat
    for (const s in streams) {
      const streamId = streams[s].streamId;
      const gs = globalStreams[streamId];
      if (gs && gs.peerConnection) {
        gs.peerConnection.close();
        gs.peerConnection.onicecandidate = null;
        gs.peerConnection.onaddstream = null;
        gs.peerConnection = null;
      }
      // İsteğe bağlı: stream'i de kaldırabilirsin
      // delete globalStreams[streamId];
    }

    //set both video tags to empty
    if (smallFeedEl.current) smallFeedEl.current.srcObject = null;
    if (largeFeedEL.current) largeFeedEL.current.srcObject = null;
  };

  if (callStatus.current === "complete") {
    return <></>;
  }

  return (
    <button onClick={hangupCall} className="btn btn-danger hang-up">
      Hang Up
    </button>
  );
};

export default HangupButton;
