// startLocalVideoStream.js
import { globalStreams } from "../../webRTCutilities/globalStreams";
import updateCallStatus from "../../redux-elements/actions/updateCallStatus";

const startLocalVideoStream = (streams, dispatch) => {
  const streamId = streams.localStream?.streamId;
  const localStream = streamId ? globalStreams[streamId]?.stream : null;

  for (const s in streams) {
    if (s !== "localStream") {
      const curStream = streams[s];
      const remoteStreamId = curStream.streamId;
      const pc = remoteStreamId
        ? globalStreams[remoteStreamId]?.peerConnection
        : null;

      if (localStream && pc) {
        localStream.getVideoTracks().forEach((track) => {
          const sender = pc
            .getSenders()
            .find((s) => s.track && s.track.kind === "video");

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

  dispatch(updateCallStatus("video", "enabled"));
};

export default startLocalVideoStream;
