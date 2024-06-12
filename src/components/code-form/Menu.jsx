import { N_Button, N_Text } from "../menu/Components";
import ImageButton from "./image_button/ImageButton";

const ELEMENTS = {
  1: {
    alt: "Button",
    element: <N_Button>Button</N_Button>,
  },
  2: {
    alt: "Text",
    element: <N_Text value="Text" />,
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
