import updateCallStatus from "../../redux-elements/actions/updateCallStatus";

const startAudioStream = (streams, dispatch) => {
  // console.log("Sanity check for startLocalVideoStream");
  const localStream = streams.localStream;
  for (const s in streams) {
    //s=>key
    if (s !== "localStream") {
      //we don't addTracks to the localStream
      const curStream = streams[s]; //Property order garanti değil, unutulmamalı
      //addTracks to all peerConnections
      //We've pulled all the video tracks from localFeed
      localStream.stream.getAudioTracks().forEach((track) => {
        curStream.peerConnection.addTrack(track, streams.localStream.stream);
      });
    }
  }
  dispatch(updateCallStatus("audio", "enabled"));
};

export default startAudioStream;
