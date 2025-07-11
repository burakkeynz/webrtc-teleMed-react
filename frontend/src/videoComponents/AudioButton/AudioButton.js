import { useDispatch, useSelector } from "react-redux";
import { useState, useEffect } from "react";
import CarretDownButton from "../CaretDownButton";
import getDevices from "../VideoButton/getDevices";
import updateCallStatus from "../../redux-elements/actions/updateCallStatus";
import addStream from "../../redux-elements/actions/addStream";
import startAudioStream from "./startAudioStream";
import { globalStreams } from "../../webRTCutilities/globalStreams";
import { v4 as uuidv4 } from "uuid";

function AudioButton({ smallFeedEl }) {
  const dispatch = useDispatch();
  const streams = useSelector((state) => state.streams);
  const callStatus = useSelector((state) => state.callStatus);
  const [caretOpen, setCaretOpen] = useState(false);
  const [audioDeviceList, setAudioDeviceList] = useState([]);

  let micText =
    callStatus.audio === "off"
      ? "Join Audio"
      : callStatus.audio === "enabled"
      ? "Mute"
      : "Unmute";

  useEffect(() => {
    if (caretOpen) {
      getDevices().then((devices) => {
        setAudioDeviceList([
          ...devices.audioOutputDevices,
          ...devices.audioInputDevices,
        ]);
      });
    }
  }, [caretOpen]);

  const startStopAudio = async () => {
    console.log("[AudioButton] Tıklandı!");

    const streamId = streams.localStream?.streamId;
    let localStream = streamId ? globalStreams[streamId]?.stream : null;

    if (callStatus.audio === "enabled") {
      console.log("[AudioButton] Disabling audio tracks...");
      dispatch(updateCallStatus("audio", "disabled"));
      localStream?.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
      return;
    }

    if (!localStream) {
      console.log("[AudioButton] No localStream. GUM çağrılıyor...");
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        console.log("[AudioButton] GUM audioStream:", audioStream);

        const newId = uuidv4();
        globalStreams[newId] = {
          stream: audioStream,
          peerConnection: null,
        };
        dispatch(addStream("localStream", newId)); // SADECE ID!
        localStream = audioStream;
      } catch (err) {
        console.error("[AudioButton] GUM error:", err);
        return;
      }
    } else {
      console.log("[AudioButton] Existing localStream bulundu.");
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length === 0) {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        audioStream.getAudioTracks().forEach((track) => {
          localStream.addTrack(track);
        });
      } else {
        audioTracks.forEach((track) => (track.enabled = true));
      }
    }

    dispatch(updateCallStatus("audio", "enabled"));

    // Store'a veya fonksiyona stream obje değil, id ile eriş!
    startAudioStream(streams, dispatch);
  };

  return (
    <div className="button-wrapper d-inline-block">
      <i
        className="fa fa-caret-up choose-audio"
        onClick={() => setCaretOpen(!caretOpen)}
      ></i>
      <div className="button mic" onClick={startStopAudio}>
        <i className="fa fa-microphone"></i>
        <div className="btn-text">{micText}</div>
      </div>
      {caretOpen && (
        <CarretDownButton
          defaultValue={callStatus.audioDevice}
          changeHandler={() => {}}
          deviceList={audioDeviceList}
          type="audio"
        />
      )}
    </div>
  );
}

export default AudioButton;
