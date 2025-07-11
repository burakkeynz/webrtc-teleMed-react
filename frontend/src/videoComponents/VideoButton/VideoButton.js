import { useDispatch, useSelector } from "react-redux";
import { useState, useEffect } from "react";
import startLocalVideoStream from "./startLocalVideoStream";
import updateCallStatus from "../../redux-elements/actions/updateCallStatus";
import getDevices from "./getDevices";
import addStream from "../../redux-elements/actions/addStream";
import { globalStreams } from "../../webRTCutilities/globalStreams";
import { v4 as uuidv4 } from "uuid";
import CarretDownButton from "../CaretDownButton";

function VideoButton({ smallFeedEl }) {
  const dispatch = useDispatch();
  const callStatus = useSelector((state) => state.callStatus);
  const streams = useSelector((state) => state.streams);
  const [pendingUpdate, setPendingUpdate] = useState(false); //media'nın hala yüklenemediği koşul için kullanacağımız state
  const [caretOpen, setCaretOpen] = useState(false);
  const [videoDeviceList, setVideoDeviceList] = useState([]);

  const changeVideoDevice = async (e) => {
    //the user changes to the desired video device
    //1.we need to get that device
    const deviceId = e.target.value;
    // console.log(deviceId, "Sanity check for deviceId");
    //2. we need to GUM (permission)
    const newConstraints = {
      audio:
        callStatus.audioDevice === "default"
          ? true
          : { deviceId: { exact: callStatus.audioDevice } },
      video: { deviceId: { exact: deviceId } },
    };
    const stream = await navigator.mediaDevices.getUserMedia(newConstraints);
    //3.update videoDevice Redux, and that video is enabled
    dispatch(updateCallStatus("videoDevice", deviceId));
    dispatch(updateCallStatus("video", "enabled"));
    //4. update the smallFeedEl
    smallFeedEl.current.srcObject = stream;
    //5. Update the localStream in streams
    const newId = uuidv4();
    globalStreams[newId] = {
      stream,
      peerConnection: null,
    };
    dispatch(addStream("localStream", newId));
    //6.Add tracks
    const [videoTrack] = stream.getVideoTracks();
    for (const s in streams) {
      if (s !== "localStream") {
        const remoteStreamId = streams[s].streamId;
        const pc = remoteStreamId
          ? globalStreams[remoteStreamId]?.peerConnection
          : null;
        if (pc) {
          const senders = pc.getSenders();
          //find the sender that is in charge of the video track
          const sender = senders.find((s) => {
            if (s.track) {
              return s.track.kind === videoTrack.kind;
            } else {
              return false;
            }
          });
          sender?.replaceTrack(videoTrack);
        }
      }
    }
  };

  useEffect(() => {
    const getDevicesAsync = async () => {
      if (caretOpen) {
        //we need to check for video devices
        const devices = await getDevices();
        console.log(devices.videoDevices);
        setVideoDeviceList(devices.videoDevices);
      }
    };
    getDevicesAsync();
  }, [caretOpen]);

  const startStopVideo = async () => {
    console.log("Sanity check.");

    const streamId = streams.localStream?.streamId;
    let localStream = streamId ? globalStreams[streamId]?.stream : null;

    if (callStatus.video === "enabled") {
      dispatch(updateCallStatus("video", "disabled"));
      if (smallFeedEl.current) {
        smallFeedEl.current.srcObject = null;
      }
      const tracks = localStream?.getVideoTracks() || [];
      tracks.forEach((track) => {
        track.enabled = false;
      });
    } else {
      if (!localStream) {
        // GUM çağır
        try {
          const constraints = {
            video: true,
            audio: false,
          };
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          const newId = uuidv4();
          globalStreams[newId] = {
            stream,
            peerConnection: null,
          };
          dispatch(addStream("localStream", newId));
          localStream = stream;
        } catch (e) {
          console.error("GUM çağrısı başarısız:", e);
          return;
        }
      }
      dispatch(updateCallStatus("video", "enabled"));

      const tracks = localStream?.getVideoTracks() || [];
      tracks.forEach((track) => {
        track.enabled = true;
      });

      smallFeedEl.current.srcObject = localStream;

      // Sadece id ile çalış!
      startLocalVideoStream(streams, dispatch);
    }
  };

  useEffect(() => {
    if (pendingUpdate && callStatus.haveMedia) {
      console.log(`Pending update succeeded`);
      setPendingUpdate(false);
      const streamId = streams.localStream?.streamId;
      const localStream = streamId ? globalStreams[streamId]?.stream : null;
      if (localStream) {
        smallFeedEl.current.srcObject = localStream;
      }
      startLocalVideoStream(streams, dispatch);
    }
  }, [pendingUpdate, callStatus.haveMedia, streams]);

  return (
    <div className="button-wrapper video-button d-inline-block">
      <i
        className="fa fa-caret-up choose-video"
        onClick={() => setCaretOpen(!caretOpen)}
      ></i>
      <div className="button camera" onClick={startStopVideo}>
        <i className="fa fa-video"></i>
        <div className="btn-text">
          {callStatus.video === "enabled" ? "Stop" : "Start"} Video
        </div>
      </div>
      {caretOpen ? (
        <CarretDownButton
          defaultValue={callStatus.videoDevice}
          changeHandler={changeVideoDevice}
          deviceList={videoDeviceList}
          type="video"
        />
      ) : null}
    </div>
  );
}

export default VideoButton;
