import ImageButton from "./image_button/ImageButton";
import { N_Button, N_Label, N_Text } from "../menu/Components";

const ELEMENTS = {
  1: {
    alt: "Button",
    element: <N_Button>Button</N_Button>,
  },
  2: {
    alt: "Text",
    element: <N_Text value="Text" />,
  },
  3: {
    alt: "Label",
    element: <N_Label>Label</N_Label>,
  },
};

const Menu = ({}) => {
  return (
    <>
      <div style={{ display: "inline-block" }}>
        {Object.keys(ELEMENTS).map((key) => (
          <ImageButton key={key} elementId={key} alt={ELEMENTS[key].alt} />
        ))}
      </div>
    </>
  );
};

export default Menu;

export { ELEMENTS };
