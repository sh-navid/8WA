import styled from "styled-components";
import { colors } from "../../utils/static";

const N_Button = styled.button`
  padding: 0.75em;
  color: white;
  border-radius: 0.5em;
  background-color: ${colors.accent};
  border: none;
`;

export { N_Button };

const N_Text = styled.input`
  padding: 0.75em;
  color: white;
  border-radius: 0.5em;
  background-color: white;
  border: .1em solid ${colors.accent};
`;

export { N_Text };
