import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import "./videoComponents.css";
import CallInfo from "./CallInfo";
import ChatWindow from "./ChatWindow";
import HangupButton from "./HangupButton";
import ActionButtons from "./ActionButtons";
import { useDispatch, useSelector } from "react-redux";
import socketConnection from "../webRTCutilities/socketConnection";
import clientSocketListener from "../webRTCutilities/clientSocketListener";
import { globalStreams } from "../webRTCutilities/globalStreams";
import axios from "axios";
import updateCallStatus from "../redux-elements/actions/updateCallStatus";
import { v4 as uuidv4 } from "uuid";
import createPeerConnection from "../webRTCutilities/createPeerConnection";

function MainVideoPage() {
  const dispatch = useDispatch();
  const callStatus = useSelector((state) => state.callStatus);
  const streams = useSelector((state) => state.streams);
  const [searchParams] = useSearchParams();
  const [apptInfo, setAppInfo] = useState({});
  const smallFeedEl = useRef(null);
  const largeFeedEL = useRef(null);
  const localAudioEl = useRef(null);
  const uuidRef = useRef(null);
  const streamsRef = useRef(null);
  const [showCallInfo, setShowCallInfo] = useState(true);

  // Debug amaçlı
  useEffect(() => {
    console.log("[CLIENT] streams değişti:", streams);
    if (streams.remote1) {
      streamsRef.current = streams;
    }
  }, [streams]);

  // --- 1. LOCAL STREAM YÜKLE (ilk açılışta sadece bir kez)
  useEffect(() => {
    // Eğer zaten eklenmişse tekrar getUserMedia çağırma
    if (streams.localStream) return;
    const fetchMedia = async () => {
      try {
        const constraints = { video: true, audio: true };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        const newId = uuidv4();
        globalStreams[newId] = { stream, peerConnection: null };
        dispatch({
          type: "ADD_STREAM",
          payload: { who: "localStream", streamId: newId },
        });
        dispatch(updateCallStatus("haveMedia", true));
        // Local feed'i video'ya ata
        if (smallFeedEl.current) {
          smallFeedEl.current.srcObject = stream;
        }
      } catch (err) {
        console.error("[CLIENT] fetchMedia ERROR:", err);
      }
    };
    fetchMedia();
    // eslint-disable-next-line
  }, []);

  // --- 2. PeerConnection ve remote1 MediaStream oluştur + localStream'i peerConnection'a ekle ---
  useEffect(() => {
    const createPCandRemote = async () => {
      const { peerConnection, remoteStream } = await createPeerConnection(
        addIceCandidateToPc
      );
      // <<< ! DİKKAT! >>> LOCAL STREAM'i ekle!
      const localStreamId = streams.localStream?.streamId;
      const localStream = localStreamId
        ? globalStreams[localStreamId]?.stream
        : null;
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStream);
        });
      }
      // Remote'ı kaydet
      const remoteId = uuidv4();
      globalStreams[remoteId] = {
        stream: remoteStream,
        peerConnection,
        pendingCandidates: [],
      };
      dispatch({
        type: "ADD_STREAM",
        payload: { who: "remote1", streamId: remoteId },
      });
      console.log(
        "[CLIENT] PeerConnection ve remote1 oluşturuldu!",
        remoteStream
      );

      // Local stream'i küçük feed'e, remote'u büyük feed'e ATA
      if (smallFeedEl.current && localStream)
        smallFeedEl.current.srcObject = localStream;
      if (largeFeedEL.current) largeFeedEL.current.srcObject = remoteStream;
    };
    if (streams.localStream && !streams.remote1) {
      createPCandRemote();
    }
    // eslint-disable-next-line
  }, [streams.localStream, streams.remote1]);

  // --- 3. Offer oluştur ---
  useEffect(() => {
    const createOfferAsync = async () => {
      let looped = false;
      for (const s in streams) {
        if (s !== "localStream") {
          looped = true;
          const streamId = streams[s].streamId;
          const gs = globalStreams[streamId];
          const pc = gs?.peerConnection;
          if (!pc) continue;
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            const token = searchParams.get("token");
            const socket = socketConnection(token);
            socket.emit("newOffer", { offer, apptInfo });
            dispatch(updateCallStatus("haveCreatedOffer", true)); // <<< ! DİKKAT! ekle
            console.log("[CLIENT] EMIT EDİLDİ:", offer, apptInfo);
          } catch (err) {
            console.error("createOffer HATASI:", err);
          }
        }
      }
      if (!looped) {
        console.log("[CLIENT] For döngüsüne hiç girilmedi! streams:", streams);
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
    // eslint-disable-next-line
  }, [
    callStatus.audio,
    callStatus.video,
    callStatus.haveCreatedOffer,
    apptInfo,
    streams,
  ]);

  // --- 4. Answer geldiyse setRemoteDescription + buffered ICE ---
  useEffect(() => {
    const asyncAddAnswer = async () => {
      for (const s in streams) {
        if (s !== "localStream") {
          const streamId = streams[s].streamId;
          const gs = globalStreams[streamId];
          const pc = gs?.peerConnection;
          if (!pc) continue;
          if (pc.signalingState !== "have-local-offer") {
            console.warn(
              "[CLIENT] setRemoteDescription(answer) atlandı, çünkü signalingState:",
              pc.signalingState
            );
            continue;
          }
          await pc.setRemoteDescription(callStatus.answer);
          console.log("[CLIENT] setRemoteDescription(answer) TAMAMLANDI");
          // BUFFER'daki ICE'ları ekle
          if (gs.pendingCandidates && gs.pendingCandidates.length > 0) {
            gs.pendingCandidates.forEach((c) => {
              pc.addIceCandidate(c).catch((err) => {
                console.error("Buffered ICE eklenemedi:", err);
              });
            });
            gs.pendingCandidates = [];
            console.log("[CLIENT] Buffer'daki ICE'lar eklendi");
          }
        }
      }
    };
    if (callStatus.answer) {
      asyncAddAnswer();
    }
  }, [callStatus.answer, streams]);

  // --- 5. Token decode
  useEffect(() => {
    const token = searchParams.get("token");
    const fetchDecodedToken = async () => {
      const res = await axios.post("https://localhost:9000/validate-link", {
        token,
      });
      setAppInfo(res.data);
      uuidRef.current = res.data.uuid;
    };
    fetchDecodedToken();
    // eslint-disable-next-line
  }, []);

  // --- 6. Socket listener
  useEffect(() => {
    const token = searchParams.get("token");
    const socket = socketConnection(token);
    const cleanup = clientSocketListener(socket, dispatch, addIceCandidateToPc);
    return cleanup;
  }, [searchParams, dispatch]);

  // --- 7. Video elementlerini her stream güncellendiğinde ata (garanti olsun) ---
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

  // --- 8. Local audio yönetimi
  useEffect(() => {
    if (callStatus.audio === "enabled") {
      const streamId = streams.localStream?.streamId;
      const localStream = streamId ? globalStreams[streamId]?.stream : null;
      if (localStream && localAudioEl.current) {
        if (localAudioEl.current.srcObject !== localStream) {
          localAudioEl.current.srcObject = localStream;
        }
        localAudioEl.current.play().catch(() => {});
      }
    } else if (callStatus.audio === "disabled" || callStatus.audio === "off") {
      if (localAudioEl.current) {
        localAudioEl.current.srcObject = null;
      }
    }
  }, [callStatus.audio, streams]);

  // ICE BUFFER'lı ekleme fonksiyonu
  const addIceCandidateToPc = (iceC) => {
    for (const s in streamsRef.current) {
      if (s !== "localStream") {
        const streamId = streamsRef.current[s].streamId;
        const gs = globalStreams[streamId];
        const pc = gs?.peerConnection;
        if (pc) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            pc.addIceCandidate(iceC)
              .then(() => {
                console.log("[CLIENT] ICE candidate eklendi.");
              })
              .catch((err) => {
                console.error("[CLIENT] ICE candidate eklenemedi:", err);
              });
          } else {
            if (!gs.pendingCandidates) gs.pendingCandidates = [];
            gs.pendingCandidates.push(iceC);
            console.log("[CLIENT] ICE candidate kuyruğa atıldı.");
          }
        }
      }
    }
  };

  useEffect(() => {
    const localStreamId = streams.localStream?.streamId;
    const localStream = localStreamId
      ? globalStreams[localStreamId]?.stream
      : null;
    const remoteStreamId = streams.remote1?.streamId;
    const remoteStream = remoteStreamId
      ? globalStreams[remoteStreamId]?.stream
      : null;

    // Eğer her iki stream de DOM'da atanmışsa info yazısını gizle
    if (
      localStream &&
      remoteStream &&
      smallFeedEl.current &&
      largeFeedEL.current &&
      smallFeedEl.current.srcObject === localStream &&
      largeFeedEL.current.srcObject === remoteStream
    ) {
      setShowCallInfo(false);
    } else {
      setShowCallInfo(true);
    }
  }, [streams, smallFeedEl.current, largeFeedEL.current]);
  // ... addIce fonksiyonu aynı kalabilir.

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
          ></video>
          <video
            id="own-feed"
            ref={smallFeedEl}
            autoPlay
            controls
            playsInline
          ></video>
          <audio id="local-audio" ref={localAudioEl} autoPlay playsInline />
          {showCallInfo ? <CallInfo apptInfo={apptInfo} /> : null}
          <ChatWindow />
        </div>
        <ActionButtons smallFeedEl={smallFeedEl} largeFeedEL={largeFeedEL} />
      </div>
    </h1>
  );
}

export default MainVideoPage;
