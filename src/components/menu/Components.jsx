import styled from "styled-components";
import { colors } from "../../utils/static";

const N_Button = styled.button`
  color: white;
  border: none;
  padding: 0.75em;
  border-radius: 0.5em;
  background-color: ${colors.accent};
  width:100%;
`;

export { N_Button };

const N_Text = styled.input`
  color: white;
  padding: 0.75em;
  border-radius: 0.5em;
  background-color: white;
  border: 0.1em solid ${colors.accent};
  width:50%;
`;

export { N_Text };

const N_Label = styled.label`
  width:100%;
`;

export { N_Label };
