import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import "./videoComponents.css";
import CallInfo from "./CallInfo";
import ChatWindow from "./ChatWindow";
import HangupButton from "./HangupButton";
import ActionButtons from "./ActionButtons";
import addStream from "../redux-elements/actions/addStream";
import { useDispatch, useSelector } from "react-redux";
import createPeerConnection from "../webRTCutilities/createPeerConnection";
import updateCallStatus from "../redux-elements/actions/updateCallStatus";
import socketConnection from "../webRTCutilities/socketConnection";
import proSocketListeners from "../webRTCutilities/proSocketListeners";
import { globalStreams } from "../webRTCutilities/globalStreams";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";

function ProMainVideoPage() {
  const dispatch = useDispatch();
  const callStatus = useSelector((state) => state.callStatus);
  const streams = useSelector((state) => state.streams);
  const [searchParams] = useSearchParams();
  const [appInfo, setAppInfo] = useState({});
  const smallFeedEl = useRef(null);
  const largeFeedEL = useRef(null);
  const streamsRef = useRef(null);

  // 1. LOCAL STREAM YÜKLE
  useEffect(() => {
    if (streams.localStream) return; // tekrar çağırma
    const fetchMedia = async () => {
      try {
        const constraints = { video: true, audio: true };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        const newId = uuidv4();
        globalStreams[newId] = { stream, peerConnection: null };
        dispatch(addStream("localStream", newId));
        dispatch(updateCallStatus("haveMedia", true));
        if (smallFeedEl.current) smallFeedEl.current.srcObject = stream;
      } catch (err) {
        console.error("[PRO] fetchMedia ERROR:", err);
      }
    };
    fetchMedia();
    // eslint-disable-next-line
  }, []);

  // 2. OFFER GELDİĞİNDE: PEER CONNECTION KUR + OFFER'I SET ET + LOCAL TRACK EKLE
  useEffect(() => {
    const setupPeerConnection = async () => {
      if (!callStatus.offer || streams.remote1) return;

      // PeerConnection kur
      const { peerConnection, remoteStream } = await createPeerConnection(
        addIce
      );

      // localStream ekle!
      const localStreamId = streams.localStream?.streamId;
      const localStream = localStreamId
        ? globalStreams[localStreamId]?.stream
        : null;
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStream);
        });
      }

      // remote1 olarak kaydet
      const remoteId = uuidv4();
      globalStreams[remoteId] = {
        stream: remoteStream,
        peerConnection,
        pendingCandidates: [],
      };
      dispatch(addStream("remote1", remoteId));
      streamsRef.current = { ...streams, remote1: { streamId: remoteId } };

      // OFFER'ı set et
      await peerConnection.setRemoteDescription(callStatus.offer);
      console.log(
        "[PRO] setRemoteDescription(offer) tamam, signalingState:",
        peerConnection.signalingState
      );

      // Buffer'daki ICE'ları ekle
      if (globalStreams[remoteId].pendingCandidates?.length > 0) {
        globalStreams[remoteId].pendingCandidates.forEach((c) => {
          peerConnection.addIceCandidate(c).catch((err) => {
            console.error("[PRO] BUFFER'dan ICE eklenemedi:", err);
          });
        });
        globalStreams[remoteId].pendingCandidates = [];
        console.log("[PRO] Buffer'daki ICE'lar eklendi");
      }

      // remoteStream'i büyük ekrana ata
      if (largeFeedEL.current) largeFeedEL.current.srcObject = remoteStream;
      // localStream'i küçük ekrana ata
      if (smallFeedEl.current && localStream)
        smallFeedEl.current.srcObject = localStream;
    };

    if (callStatus.offer && streams.localStream && !streams.remote1) {
      setupPeerConnection();
    }
    // eslint-disable-next-line
  }, [callStatus.offer, streams.localStream, streams.remote1]);

  // 3. ANSWER OLUŞTUR (SIGNALING STATE UYUMLU İSE)
  useEffect(() => {
    const createAnswerAsync = async () => {
      if (!streamsRef.current || !streamsRef.current.remote1) return;
      const remoteId = streamsRef.current.remote1.streamId;
      const pc = globalStreams[remoteId]?.peerConnection;
      if (!pc) return;

      if (pc.signalingState !== "have-remote-offer") {
        console.warn(
          "[PRO] createAnswer çağrılmadı, çünkü signalingState:",
          pc.signalingState
        );
        return;
      }
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      dispatch(updateCallStatus("haveCreatedAnswer", true));
      dispatch(updateCallStatus("answer", answer));
      const token = searchParams.get("token");
      const uuid = searchParams.get("uuid");
      const socket = socketConnection(token);
      socket.emit("newAnswer", { answer, uuid });
      console.log("[PRO] newAnswer emit edildi:", answer);
    };

    if (
      callStatus.audio === "enabled" &&
      callStatus.video === "enabled" &&
      !callStatus.haveCreatedAnswer
    ) {
      createAnswerAsync();
    }
  }, [callStatus.audio, callStatus.video, callStatus.haveCreatedAnswer]);

  // 4. ICE CANDIDATE EKLEME (BUFFER'LA)
  const addIceCandidateToPc = (iceC) => {
    if (!streamsRef.current || !streamsRef.current.remote1) return;
    const remoteId = streamsRef.current.remote1.streamId;
    const gs = globalStreams[remoteId];
    const pc = gs?.peerConnection;
    if (!pc) return;
    if (pc.remoteDescription && pc.remoteDescription.type) {
      pc.addIceCandidate(iceC)
        .then(() => console.log("[PRO] ICE candidate eklendi."))
        .catch((err) => console.error("[PRO] ICE candidate eklenemedi:", err));
    } else {
      if (!gs.pendingCandidates) gs.pendingCandidates = [];
      gs.pendingCandidates.push(iceC);
      console.log("[PRO] ICE candidate kuyruğa atıldı (pending).");
    }
  };

  // ICE gönderme fonksiyonu
  const addIce = (iceC) => {
    const socket = socketConnection(searchParams.get("token"));
    socket.emit("iceToServer", {
      iceC,
      who: "professional",
      uuid: searchParams.get("uuid"),
    });
    console.log("[PRO] iceToServer emit:", iceC);
  };

  // 5. ICE CANDIDATE'LARI GETİR (ve bufferla)
  useEffect(() => {
    const getIceAsync = async () => {
      if (!streamsRef.current || !streamsRef.current.remote1) return;
      const socket = socketConnection(searchParams.get("token"));
      const uuid = searchParams.get("uuid");
      const iceCandidates = await socket.emitWithAck(
        "getIce",
        uuid,
        "professional"
      );
      console.log("[PRO] getIce ile alınan ICE candidate'lar:", iceCandidates);
      iceCandidates.forEach((iceC) => addIceCandidateToPc(iceC));
    };
    if (streams.remote1) {
      getIceAsync();
    }
  }, [streams.remote1]);

  // Token decode
  useEffect(() => {
    const token = searchParams.get("token");
    const fetchDecodedToken = async () => {
      const res = await axios.post("https://localhost:9000/validate-link", {
        token,
      });
      setAppInfo(res.data);
      console.log("[PRO] appInfo SET edildi:", res.data);
    };
    fetchDecodedToken();
  }, []);

  // Socket listenerları bağla
  useEffect(() => {
    const token = searchParams.get("token");
    const socket = socketConnection(token);
    const cleanup = proSocketListeners.proVideoSocketListeners(
      socket,
      addIceCandidateToPc
    );
    return cleanup;
  }, [searchParams]);

  // Video feed güncelle (garanti olsun)
  useEffect(() => {
    // local feed küçük ekrana
    const localStreamId = streams.localStream?.streamId;
    const localStream = localStreamId
      ? globalStreams[localStreamId]?.stream
      : null;
    if (localStream && smallFeedEl.current) {
      if (smallFeedEl.current.srcObject !== localStream) {
        smallFeedEl.current.srcObject = localStream;
      }
    }
    // remote feed büyük ekrana
    const remoteStreamId = streams.remote1?.streamId;
    const remoteStream = remoteStreamId
      ? globalStreams[remoteStreamId]?.stream
      : null;
    if (remoteStream && largeFeedEL.current) {
      if (largeFeedEL.current.srcObject !== remoteStream) {
        largeFeedEL.current.srcObject = remoteStream;
      }
    }
  }, [streams]);

  // Render
  return (
    <h1>
      <div className="main-video-page">
        <div className="video-chat-wrapper">
          <video
            id="large-feed"
            ref={largeFeedEL}
            autoPlay
            controls
            playsInline
          />
          <video
            id="own-feed"
            ref={smallFeedEl}
            autoPlay
            controls
            playsInline
          />
          {callStatus.audio === "off" || callStatus.video === "offf" ? (
            <div className="call-info">
              <h1>
                {searchParams.get("client") || "Error-NoClient"} is in the
                waiting room.
                <br />
                Call will start when video and audio are enabled
              </h1>
            </div>
          ) : null}
          <ChatWindow />
        </div>
        <ActionButtons smallFeedEl={smallFeedEl} largeFeedEL={largeFeedEL} />
      </div>
    </h1>
  );
}

export default ProMainVideoPage;
