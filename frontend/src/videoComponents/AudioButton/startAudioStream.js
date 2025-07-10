import updateCallStatus from "../../redux-elements/actions/updateCallStatus";

const startAudioStream = (streams, dispatch) => {
  const localStream = streams.localStream;

  for (const s in streams) {
    if (s !== "localStream") {
      const curStream = streams[s];
      const pc = curStream.peerConnection;

      localStream.stream.getAudioTracks().forEach((track) => {
        const sender = pc
          .getSenders()
          .find((s) => s.track && s.track.kind === "audio");

        if (sender) {
          sender.replaceTrack(track);
          console.log("replaceTrack çağrıldı:", track);
        } else {
          pc.addTrack(track, streams.localStream.stream);
          console.log("addTrack çağrıldı:", track);
        }
      });
    }
  }

  dispatch(updateCallStatus("audio", "enabled"));
};

export default startAudioStream;
