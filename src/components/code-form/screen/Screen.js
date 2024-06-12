import Flex from "../layouts/Flex";
import Adder from "../adder/Adder";
import { ELEMENTS } from "../Menu";
import PlaceHolder from "../layouts/PlaceHolder";
import { useState, useEffect, useContext } from "react";
import PreviewContext from "../../../contexts/previewContext";
import ViewModeContext from "../../../contexts/viewModeContext";

const DRAG_OVER = "IWA-Cell-Drag-Over";

const Screen = () => {
  const [data, setData] = useState([[<PlaceHolder />]]);
  const { preview, setPreview } = useContext(PreviewContext);
  const { viewMode, setViewMode } = useContext(ViewModeContext);

  useEffect(() => {}, [data]);

  /* ***************************************************************** */

  const removeClass = () => {
    let elements = document.getElementsByClassName(DRAG_OVER);
    elements[0] && elements[0].classList.remove(DRAG_OVER);
  };

  document.ondragstart = function (event) {
    event.dataTransfer.setData("el", event.target.getAttribute("elementId"));
  };

  document.ondragend = function () {
    removeClass();
  };

  /* Events fired on the drop target */
  document.ondragover = function (event) {
    event.preventDefault();
    removeClass();

    if (event.target.classList.contains("IWA-DragHere"))
      event.target.className += " " + DRAG_OVER;
  };

  document.ondrop = function (event) {
    event.preventDefault();
    const elementId = event.dataTransfer.getData("el");

    if (event.target.classList.contains("IWA-DragHere")) {
      let r = parseInt(event.target.parentNode.getAttribute("r"));
      let c = parseInt(event.target.parentNode.getAttribute("c"));

      const tmpRow = data[r].slice();
      tmpRow[c] = ELEMENTS[elementId].element;
      const tmpData = data.slice();
      tmpData[r] = tmpRow;
      setData(tmpData);
    }
  };

  /* ***************************************************************** */

  const getAdder = (row) => {
    return (
      <Adder
        key={row}
        row={row}
        onClick={(row) => {
          handleSelect(row);
        }}
      />
    );
  };

  const handleSelect = (row) => {
    const tmp = data.slice();
    tmp.splice(row, 0, [<PlaceHolder />]);
    setData(tmp);
  };

  /* ***************************************************************** */

  return (
    <>
      <br />
      <div>
        <span>Screen1</span>
        <div
          style={{
            width: "390px",
            height: "844px",
            borderRadius: "1em",
            overflowY: "scroll",
            border: "4px solid lightgray",
            fontSize: "100%",
          }}
          className={"CodeForm-ViewMode " + viewMode}
        >
          {!preview ? getAdder(0) : ""}
          {data.map((_, rowIndex) => (
            <>
              {<Flex data={data} setData={setData} rowIndex={rowIndex} />}
              {!preview ? getAdder(rowIndex + 1) : ""}
            </>
          ))}
        </div>
      </div>
    </>
  );
};

export default Screen;
