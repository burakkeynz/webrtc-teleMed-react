//Bu fonksiyonun amacı tüm peerConnections'ı (addTracks) güncellemek ve redux callStatus'u güncellemek
//Component içinde olmadığımız için useSelector'u kullanamıyoruz o yüzden dispatch

import updateCallStatus from "../../redux-elements/actions/updateCallStatus";

const startLocalVideoStream = (streams, dispatch) => {
  // console.log("Sanity check for startLocalVideoStream");
  const localStream = streams.localStream;
  for (const s in streams) {
    //s=>key
    if (s !== "localStream") {
      //we don't addTracks to the localStream
      const curStream = streams[s]; //Property order garanti değil, unutulmamalı
      //addTracks to all peerConnections
      //We've pulled all the video tracks from localFeed
      localStream.stream.getVideoTracks().forEach((track) => {
        curStream.peerConnection.addTrack(track, streams.localStream.stream);
      });
      //update redux callStatus
      dispatch(updateCallStatus("video", "enabled"));
    }
  }
};

export default startLocalVideoStream;
