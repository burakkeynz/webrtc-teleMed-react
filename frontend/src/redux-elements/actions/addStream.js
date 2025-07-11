export default (who, streamId) => {
  return {
    type: "ADD_STREAM",
    payload: {
      who,
      streamId,
    },
  };
};
