const initState = {
  current: "idle", //diğerleri negotiating, progress, complete vs olcak
  video: "off", //Video feed status: 'off', 'enabled', 'disabled', 'complete'
  audio: "off", //Audio feed status: 'off', 'enabled', 'disabled', 'complete'
  audioDevice: "default", //GUM ile enumarete device olcak, chosen audio device
  videoDevice: "default", //GUM ile enumarete device olcak, chosen video device
  shareScreen: false,
  haveMedia: false, //is there a local Stream, has GUM been run? başta açılınca tıklayarak kamera ve audio açılmasını sağlayan yapı için
  haveCreatedOffer: false,
};

export default (state = initState, action) => {
  if (action.type === "UPDATE_CALL_STATUS") {
    const copyState = { ...state };
    copyState[action.payload.prop] = action.payload.value;
    console.log("callStatus güncellendi:", action.payload);
    console.log("Yeni callStatus state:", copyState);
    return copyState;
  } else if (action.type === "LOGOUT_ACTION" || action.type === "NEW_VERSION") {
    return initState;
  } else {
    return state;
  }
};
