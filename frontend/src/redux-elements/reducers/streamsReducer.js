//This holds all streams as objects
///{
/*      who
        stream = thing with tracks that plays in <video/>
        peerConnection = actual WebRTC connection
        */ //}

//local, remote1, remote2+
const initialState = {};

export default (state = initialState, action) => {
  if (action.type === "ADD_STREAM") {
    const copyState = { ...state };
    copyState[action.payload.who] = {
      streamId: action.payload.streamId,
    };
    return copyState;
  } else if (action.type === "LOGOUT_ACTION") {
    return {};
  } else {
    return state;
  }
};
