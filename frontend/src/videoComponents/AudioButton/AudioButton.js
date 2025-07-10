import { useDispatch, useSelector } from "react-redux";
import { useState, useEffect } from "react";
import CarretDownButton from "../CaretDownButton";
import getDevices from "../VideoButton/getDevices";
import updateCallStatus from "../../redux-elements/actions/updateCallStatus";
import addStream from "../../redux-elements/actions/addStream";
import startAudioStream from "./startAudioStream";

function AudioButton({ smallFeedEl }) {
  const dispatch = useDispatch();
  const streams = useSelector((state) => state.streams);
  const [caretOpen, setCaretOpen] = useState(false);
  const [audioDeviceList, setAudioDeviceList] = useState([]);

  const callStatus = useSelector((state) => state.callStatus);

  let micText;
  if (callStatus.audio === "off") {
    micText = "Join Audio";
  } else if (callStatus.audio === "enabled") {
    micText = "Mute";
  } else {
    micText = "Unmute";
  }

  useEffect(() => {
    const getDevicesAsync = async () => {
      if (caretOpen) {
        const devices = await getDevices();
        setAudioDeviceList(
          devices.audioOutputDevices.concat(devices.audioInputDevices)
        );
      }
    };
    getDevicesAsync();
  }, [caretOpen]);

  const startStopAudio = async () => {
    const localStream = streams.localStream?.stream;

    if (callStatus.audio === "enabled") {
      // Mute
      dispatch(updateCallStatus("audio", "disabled"));
      localStream?.getAudioTracks()?.forEach((track) => {
        track.enabled = false;
      });
    } else if (callStatus.audio === "off" || callStatus.audio === "disabled") {
      // Mic aç
      if (localStream) {
        // localStream zaten varsa → sadece track enabled yap
        const audioTracks = localStream.getAudioTracks();
        if (audioTracks.length > 0) {
          audioTracks.forEach((track) => {
            track.enabled = true;
          });
        } else {
          // Eğer audio track hiç yoksa → yeni track yarat
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
          audioStream.getAudioTracks().forEach((track) => {
            localStream.addTrack(track);
          });
        }
      } else {
        // localStream yoksa → mic stream oluştur
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        dispatch(addStream("localStream", audioStream));
      }

      dispatch(updateCallStatus("audio", "enabled"));

      startAudioStream(
        {
          ...streams,
          localStream: {
            stream: streams.localStream?.stream || localStream,
          },
        },
        dispatch
      );
    }
  };

  const changeAudioDevice = async (e) => {
    const deviceId = e.target.value.slice(5);
    const audioType = e.target.value.slice(0, 5);

    if (audioType === "output") {
      smallFeedEl.current.setSinkId(deviceId);
    } else if (audioType === "input") {
      const newConstraints = {
        audio: { deviceId: { exact: deviceId } },
        video:
          callStatus.videoDevice === "default"
            ? true
            : { deviceId: { exact: callStatus.videoDevice } },
      };

      const stream = await navigator.mediaDevices.getUserMedia(newConstraints);

      dispatch(updateCallStatus("audioDevice", deviceId));
      dispatch(updateCallStatus("audio", "enabled"));
      dispatch(addStream("localStream", stream));
      const [audioTrack] = stream.getAudioTracks();

      for (const s in streams) {
        if (s !== "localStream") {
          //getSenders will grab all the RTCRtpSenders that the PC has
          //RTCRtpSender manages how tracks are sent via the PC
          const senders = streams[s].peerConnection.getSenders();
          //find the sender that is in charge of the video track
          const sender = senders.find((s) => {
            if (s.track) {
              //if this track matches the videoTrack kind, return it
              return s.track.kind === audioTrack.kind;
            } else {
              return false;
            }
          });
          //sender is RTCRtpSender, so it can be replace the track
          sender.replaceTrack(audioTrack);
        }
      }
    }
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
          changeHandler={changeAudioDevice}
          deviceList={audioDeviceList}
          type="audio"
        />
      )}
    </div>
  );
}

export default AudioButton;
