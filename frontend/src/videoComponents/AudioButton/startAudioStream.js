// startAudioStream.js
import { globalStreams } from "../../webRTCutilities/globalStreams";
import updateCallStatus from "../../redux-elements/actions/updateCallStatus";

// Yine sadece streamId üzerinden erişim, redux'tan stream/peerConnection gelmiyor!
const startAudioStream = (streams, dispatch) => {
  const streamId = streams.localStream?.streamId;
  const localStream = streamId ? globalStreams[streamId]?.stream : null;

  for (const s in streams) {
    if (s !== "localStream") {
      const remoteStreamId = streams[s].streamId;
      const pc = remoteStreamId
        ? globalStreams[remoteStreamId]?.peerConnection
        : null;

      if (localStream && pc) {
        localStream.getAudioTracks().forEach((track) => {
          const senders = pc.getSenders() || [];
          const sender = senders.find((s) => s.track?.kind === "audio");

          if (sender) {
            sender.replaceTrack(track);
            console.log("replaceTrack çağrıldı:", track);
          } else {
            pc.addTrack(track, localStream);
            console.log("addTrack çağrıldı:", track);
          }
        });
      }
    }
  }

  dispatch(updateCallStatus("audio", "enabled"));
};

export default startAudioStream;
