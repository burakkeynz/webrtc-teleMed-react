import { useDispatch, useSelector } from "react-redux";
import { useState, useEffect } from "react";
import startLocalVideoStream from "./startLocalVideoStream";
import updateCallStatus from "../../redux-elements/actions/updateCallStatus";
import getDevices from "./getDevices";
import addStream from "../../redux-elements/actions/addStream";

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
    //4. uptade the smallFeedEl
    smallFeedEl.current.srcObject = stream;
    //5. Update the localStream in streams
    dispatch(addStream("localStream", stream));
    //6.Add tracks
    const tracks = stream.getVideoTracks();
    //come back to this later
    //If we stop the old tracks, and add the new tracks
    //that will mean renegotiation RTCRtpSender
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

  const startStopVideo = () => {
    console.log("Sanity check.");
    console.log("streams:", streams);
    console.log("smallFeedEl.current:", smallFeedEl.current);

    if (callStatus.video === "enabled") {
      dispatch(updateCallStatus("video", "disabled"));
      //bizim + olarak WebRTC feed'ini değiştirmemiz gerekiyor bu çünkü bu Redux update
      const tracks = streams.localStream.stream.getVideoTracks();
      tracks.forEach((track) => {
        track.enabled = false; //MediaStreamTrack: enabled property MDN doc başlığı, MediaStreamTrack instance'ı yani
      });
    } else if (callStatus.video === "off") {
      // off tanımladıgımızdan bu olmalı
      startLocalVideoStream(streams, dispatch);
      dispatch(updateCallStatus("video", "enabled"));
      // tracks varsa aç
      const tracks = streams.localStream?.stream?.getVideoTracks();
      tracks?.forEach((track) => {
        track.enabled = true;
      });

      // DOM'a bağla
      if (streams.localStream?.stream) {
        smallFeedEl.current.srcObject = streams.localStream.stream;
      }
    } else if (callStatus.video === "disabled") {
      dispatch(updateCallStatus("video", "enabled"));
      const tracks = streams.localStream.stream.getVideoTracks();
      tracks.forEach((track) => {
        track.enabled = true;
      });
    } else if (callStatus.haveMedia) {
      //CASE3: media'nın olduğu koşulda
      smallFeedEl.current.srcObject = streams.localStream.stream;
      //add tracks to the peerConnections
      startLocalVideoStream(streams, dispatch);
    } else {
      //CASE4: hızlı biçimde kameraya basmaya çalışılırsa, media yoksa durumu
      setPendingUpdate(true);
    }
  };

  useEffect(() => {
    if (pendingUpdate && callStatus.haveMedia) {
      console.log(`Pending update succeeded`);
      //bu useEffect pendinUpdate true olursa çalısacak
      setPendingUpdate(false); //switch back to false
      smallFeedEl.current.srcObject = streams.localStream.stream;
      startLocalVideoStream(streams, dispatch);
    }
  }, [pendingUpdate, callStatus.haveMedia]);

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
      ) : (
        <></>
      )}
    </div>
  );
}

export default VideoButton;

//Bug Fix: SDP bağlantısı displaylenmiyor
