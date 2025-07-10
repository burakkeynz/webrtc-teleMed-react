function CarretDownButton({ defaultValue, changeHandler, deviceList, type }) {
  let dropDownEl;
  if (type === "video") {
    dropDownEl = deviceList.map((vd) => {
      return (
        <option value={vd.deviceId} key={vd.deviceId}>
          {vd.label}
        </option>
      );
    });
  } else if (type === "audio") {
    const audioInputEl = [];
    const audioOutputEL = [];

    deviceList.forEach((dev, i) => {
      if (dev.kind === "audioinput") {
        audioInputEl.push(
          <option value={`input${dev.deviceId}`} key={`input${dev.deviceId}`}>
            {dev.label}
          </option>
        );
      } else if (dev.kind === "audiooutput") {
        audioOutputEL.push(
          <option value={`output${dev.deviceId}`} key={`output${dev.deviceId}`}>
            {dev.label}
          </option>
        );
        console.log(audioOutputEL);
      }
    });

    dropDownEl = [
      <optgroup label="Input Devices" key="inputGroup">
        {audioInputEl}
      </optgroup>,
      <optgroup label="Output Devices" key="outputGroup">
        {audioOutputEL}
      </optgroup>,
    ];
  }

  return (
    <div className="caret-dropdown" style={{ top: "-35px" }}>
      <select defaultValue={defaultValue} onChange={changeHandler}>
        {dropDownEl}
      </select>
    </div>
  );
}

export default CarretDownButton;
