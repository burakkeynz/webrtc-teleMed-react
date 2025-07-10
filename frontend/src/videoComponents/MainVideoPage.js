import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import "./videoComponents.css";
import CallInfo from "./CallInfo";
import ChatWindow from "./ChatWindow";
import axios from "axios";
import HangupButton from "./HangupButton";
import ActionButtons from "./ActionButtons";
import addStream from "../redux-elements/actions/addStream";
import { useDispatch, useSelector } from "react-redux";
import createPeerConnection from "../webRTCutilities/createPeerConnection";
import socket from "../webRTCutilities/socketConnection";
import updateCallStatus from "../redux-elements/actions/updateCallStatus";
import socketConnection from "../webRTCutilities/socketConnection";
import clientSocketListener from "../webRTCutilities/clientSocketListener";

function MainVideoPage() {
  const dispatch = useDispatch();
  const callStatus = useSelector((state) => state.callStatus);
  const streams = useSelector((state) => state.streams);
  //get query string finder hook
  const [searchParams, setSearchParams] = useSearchParams();
  //grab the token var. out of the query string
  const [apptInfo, setAppInfo] = useState({});
  const smallFeedEl = useRef(null); //React ref of DOM element
  const largeFeedEL = useRef(null);
  const uuidRef = useRef(null);

  //FetchMedia UseEffect
  useEffect(() => {
    //fetch the user media
    const fetchMedia = async () => {
      const constraints = {
        video: true, //must have one constraint
        audio: true,
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        dispatch(updateCallStatus("haveMedia", true)); //update our callStatus reducer to know that we have media
        dispatch(addStream("localStream", stream));
        //dispatch will send this function to the redux dispatcher so all reducers are notified
        //we send 2 args, the who and the stream
        const { peerConnection, remoteStream } = await createPeerConnection(
          addIce
        );
        stream
          .getTracks()
          .forEach((track) => peerConnection.addTrack(track, stream));

        //We don't know 'who' we are talking to for now
        dispatch(addStream("remote1", remoteStream, peerConnection)); //then we will update it dynamically when we know
        //we have a peerconnection, however, to be able to
        //make an offer, we ned SDP, info about feed
        //also we have No tracks yet
        //socket.emit.....
      } catch (err) {
        console.log(err);
      }
    };
    fetchMedia();
  }, []);

  useEffect(() => {
    const createOfferAsync = async () => {
      for (const s in streams) {
        if (s !== "localStream") {
          try {
            const pc = streams[s].peerConnection;
            const offer = await pc.createOffer();
            pc.setLocalDescription(offer);
            console.log("Oluşan offer:", offer);

            ///get the token from the url for the socket connection
            const token = searchParams.get("token");
            //get the socket from socketConnection func
            const socket = socketConnection(token);
            socket.emit("newOffer", { offer, apptInfo });
            // add our event listeners
            clientSocketListener(socket, dispatch);
          } catch (err) {
            console.error("createOffer HATASI:", err);
          }
        }
      }
    };
    if (
      callStatus.audio === "enabled" &&
      callStatus.video === "enabled" &&
      !callStatus.haveCreatedOffer &&
      apptInfo.uuid
    ) {
      createOfferAsync();
    }
  }, [
    callStatus.audio,
    callStatus.video,
    callStatus.haveCreatedOffer,
    apptInfo,
  ]);

  useEffect(() => {
    const asyncAddAnswer = async () => {
      //listen for changed to callStatus.asnwer
      //if it exist, we have an answer --> clientSocketListeners kısmında detayı var

      for (const s in streams) {
        if (s !== "localStream") {
          const pc = streams[s].peerConnection;
          await pc.setRemoteDescription(callStatus.answer);
          console.log(pc.signalingState);
          console.log("Answer added");
        }
      }
    };

    if (callStatus.answer) {
      asyncAddAnswer();
    }
  }, [callStatus.asnwer]);

  useEffect(() => {
    const token = searchParams.get("token");
    // console.log(token); //https://localhost:3000/join-video?token=helloworld dan helloworld'ü çeker
    const fetchDecodedToken = async () => {
      const res = await axios.post("https://localhost:9000/validate-link", {
        token,
      });
      console.log(res.data);
      setAppInfo(res.data);
      uuidRef.current = res.data.uuid;
    };
    fetchDecodedToken();
  }, []);

  const addIce = (iceC) => {
    //emit a new icecandidate to the signaling server
    const socket = socketConnection(searchParams.get("token"));
    socket.emit("iceToServer", {
      iceC,
      who: "client",
      uuid: uuidRef.current, //we used a useRef to keep the value fresh
    });
  };

  return (
    <h1>
      <div className="main-video-page">
        <div className="video-chat-wrapper">
          {/* Div to hold remote video, our local video, and our chat window */}
          {/*İlerleyen dönemde burda birden fazla Peerlar olursa chatte (4-5) burası dinamik şekilde yönetilmeli, şimdilik böyle 2 user kalıyor*/}
          <video
            id="large-feed"
            ref={largeFeedEL}
            autoPlay
            controls
            playsInline
          ></video>
          <video
            id="own-feed"
            ref={smallFeedEl}
            autoPlay
            controls
            playsInline
          ></video>
          {apptInfo.professionalsFullName ? (
            <CallInfo apptInfo={apptInfo} />
          ) : (
            <></>
          )}
          <ChatWindow />
        </div>
        <ActionButtons smallFeedEl={smallFeedEl} />
      </div>
    </h1>
  );
}

export default MainVideoPage;
