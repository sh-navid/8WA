import "./Header.css";
import Menu from "../Menu";
import { useContext, useState } from "react";
import ImageButton from "../image_button/ImageButton";
import PreviewContext from "../../../contexts/previewContext";

const Header = ({ }) => {
  const {preview, setPreview} = useContext(PreviewContext);
  const [selectedPreView, setSelectedPreView] = useState(1);

  const preViewItems = {
    1: { value: false, alt: "Design", icon: "9999" },
    2: { value: true, alt: "Preview", icon: "9999" },
    3: { value: true, alt: "Flow", icon: "9999" },
  };

  return (
    <>
      <div className="CodeForm-Menu">   
          {Object.keys(preViewItems).map((key) => (
            <ImageButton
              isActive={key == selectedPreView}
              onClick={() => {
                setSelectedPreView(key);
                setPreview(preViewItems[key].value);
              }}
              alt={preViewItems[key].alt}
              icon={preViewItems[key].icon}
            />
          ))}

          <span> | </span>

          <Menu/>
    
      </div>
    </>
  );
};

export default Header;
