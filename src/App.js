import { useState } from "react";
import { addToArrayAtIndex } from "./utils/array";
import PreviewContext from "./contexts/previewContext";
import ViewModeContext from "./contexts/viewModeContext";
import Header from "./components/code-form/header/Header";
import Screen from "./components/code-form/screen/Screen";
import AddSign from "./components/code-form/add-sign/AddSign";

const App = ({}) => {
  const [viewMode, setViewMode] = useState("");
  const [preview, setPreview] = useState(false);
  const [screenList, setScreenList] = useState([<Screen />]);

  const handleNewScreen = (index) => {
    setScreenList(addToArrayAtIndex(screenList, index + 1, <Screen />));
  };

  return (
    <PreviewContext.Provider value={{ preview, setPreview }}>
      <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
        <Header setViewMode={setViewMode} />

        <div style={{ overflowX: "scroll" ,width:"100%"}}>
          <AddSign
            onClick={() => {
              handleNewScreen(-1);
            }}
          />
          {screenList.map((screen, index) => (
            <>
              <div style={{ display: "inline-block" }}>{screen}</div>
              <div style={{ display: "inline-block" }}>
                <AddSign
                  onClick={() => {
                    handleNewScreen(index);
                  }}
                />
              </div>
            </>
          ))}
        </div>
      </ViewModeContext.Provider>
    </PreviewContext.Provider>
  );
};

export default App;
