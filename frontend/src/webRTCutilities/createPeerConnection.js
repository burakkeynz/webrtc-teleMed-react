import peerConfiguration from "./stunServers";

function createPeerConnection(addIce) {
  return new Promise(async (resolve, reject) => {
    const peerConnection = await new RTCPeerConnection();
    //rtcPeerConnection is the connection to the peer
    //we may need more than one this time
    //we pass it the config object, which is stun servers
    //it will get us ICE candidates
    const remoteStream = new MediaStream();
    peerConnection.addEventListener("signalingstatechange", (e) => {
      console.log("Signaling state change");
      console.log(e);
    });
    peerConnection.addEventListener("icecandidate", (e) => {
      console.log("FOUND ICE CANDIADTE");
      if (e.candidate) {
        //burası bunun için doğru bir yer değil onun yerine burda function call yapmak daha mantıklı - burası PeerC yapmak için var
        addIce(e.candidate);
      }
    });
  });
}

export default createPeerConnection;
