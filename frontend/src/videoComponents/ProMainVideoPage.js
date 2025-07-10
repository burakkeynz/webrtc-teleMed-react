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
import proSocketListeners from "../webRTCutilities/proSocketListeners";

function ProMainVideoPage() {
  const dispatch = useDispatch();
  const callStatus = useSelector((state) => state.callStatus);
  const streams = useSelector((state) => state.streams);
  //get query string finder hook
  const [searchParams, setSearchParams] = useSearchParams();
  //grab the token var. out of the query string
  const [apptInfo, setAppInfo] = useState({});
  const [haveGotIce, setHaveGotIce] = useState(false);
  const smallFeedEl = useRef(null); //React ref of DOM element
  const largeFeedEL = useRef(null);
  const streamsRef = useRef(null);

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
        stream.getTracks().forEach((track) => {
          const alreadyAdded = peerConnection
            .getSenders()
            .find((s) => s.track && s.track.id === track.id);
          if (!alreadyAdded) {
            peerConnection.addTrack(track, stream);
          } else {
            console.log("Track zaten eklenmiş:", track);
          }
        });

        //We don't know 'who' we are talking to for now
        dispatch(addStream("remote1", remoteStream, peerConnection)); //then we will update it dynamically when we know
        //we have a peerconnection, however, to be able to
        //make an offer, we ned SDP, info about feed
        //also we have No tracks yet
        //socket.emit.....
        largeFeedEL.current.srcObject = remoteStream;
      } catch (err) {
        console.log(err);
      }
    };
    fetchMedia();
  }, []);

  useEffect(() => {
    const getIceAsync = async () => {
      const socket = socketConnection(searchParams.get("token"));
      const uuid = socketConnection(searchParams.get("uuid"));
      const iceCandidates = await socket.emitWithAck(
        "getIce",
        uuid,
        "professional"
      );
      console.log("IceC received");
      console.log(iceCandidates);
      iceCandidates.forEach((iceC) => {
        for (const s in streams) {
          if (s !== "localStream") {
            const pc = streams[s].peerConnection;
            pc.addiceCandidate(iceC);
            console.log("===Added Ice Candidate===");
          }
        }
      });
    };
    if (streams.remote1 && !haveGotIce) {
      setHaveGotIce(true);
      getIceAsync();
      streamsRef.current = streams; //streamsRef oldugunu bildiğimiz an updateleme
    }
  }, [streams]);

  useEffect(() => {
    const setAsyncOffer = async () => {
      for (const s in streams) {
        if (s !== "localStream") {
          const pc = streams[s].peerConnection;
          await pc.setRemoteDescription(callStatus.offer);
          console.log(pc.signalingState); //should be have remote offer
        }
      }
    };
    //offer exist çünkü biz proSocketListeners'da newOfferWaiting altında reduxa dispatchledik
    if (callStatus.offer && streams.remote1 && streams.remote1.peerConnection) {
      setAsyncOffer();
    }
  }, [callStatus.offer, streams.remote1]);

  useEffect(() => {
    const createAnswerAsync = async () => {
      //we have audio and video so we can make an answer and setLocalDescription+setRemoteDescription, since this is our client2
      for (const s in streams) {
        if (s !== "localStream") {
          const pc = streams[s].peerConnection;
          //make an answer
          const answer = await pc.createAnswer();
          //since this is the answering client, the answer is the localDescription
          await pc.setLocalDescription(answer);
          console.log(pc.signalingState); //have local answer
          dispatch(updateCallStatus("haveCreatedAnswer", true));
          dispatch(updateCallStatus("answer", answer));
          //emit the answer to the server
          const token = searchParams.get("token");
          const uuid = searchParams.get("uuid");
          const socket = socketConnection(token);
          socket.emit("newAnswer", { answer, uuid });
        }
      }
    };
    //We only create an answer if audio and video are enabled AND not created an answer
    //this may run many times but hese 3 event will only happen one
    if (
      callStatus.audio === "enabled" &&
      callStatus.video === "enabled" &&
      !callStatus.haveCreatedAnswer
    ) {
      createAnswerAsync();
    }
  }, [callStatus.audio, callStatus.video, callStatus.haveCreatedAnswer]);

  useEffect(() => {
    const token = searchParams.get("token");
    // console.log(token); //https://localhost:3000/join-video?token=helloworld dan helloworld'ü çeker
    const fetchDecodedToken = async () => {
      const res = await axios.post("https://localhost:9000/validate-link", {
        token,
      });
      console.log(res.data);
      setAppInfo(res.data);
    };
    fetchDecodedToken();
  }, []);

  useEffect(() => {
    const token = searchParams.get("token");
    const socket = socketConnection(token);
    proSocketListeners.proVideoSocketListeners(socket, addIceCandidateToPc);
  }, []);

  const addIceCandidateToPc = (iceC) => {
    //add an ice candidate from the remote to the pc
    for (const s in streamsRef.current) {
      if (s !== "localStream") {
        const pc = streamsRef.current[s].peerConnection;
        pc.addiceCandidate(iceC);
        console.log("Existing page presence'a iceCandidate eklendi");
        //yani professional çoktan page'teyse ekleniyo
      }
    }
  };

  const addIce = (iceC) => {
    //emit icecandidate to the signaling server
    const socket = socketConnection(searchParams.get("token"));
    socket.emit("iceToServer", {
      iceC,
      who: "professional",
      uuid: searchParams.get("uuid"), //we used a useRef to keep the value fresh
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
          {callStatus.audio === "off" || callStatus.video === "offf" ? (
            <div className="call-info">
              <h1>
                {searchParams.get("client") || "Error-NoClient"} is in the
                waiting room.
                <br />
                Call will start when video and audio are enabled
              </h1>
            </div>
          ) : (
            <></>
          )}
          <ChatWindow />
        </div>
        <ActionButtons smallFeedEl={smallFeedEl} largeFeedEL={largeFeedEL} />
      </div>
    </h1>
  );
}

export default ProMainVideoPage;
