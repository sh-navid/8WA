/*[[port/client/src/components/Kbd.js]]*/
import styled from "styled-components";
import React from "react";

/**
 * Styled component for rendering keyboard input.
 *
 * The `StyledKbd` component is a styled `kbd` element that provides a consistent
 * visual representation for keyboard input within the application. It uses
 * `styled-components` for easy styling and theming.
 */
const StyledKbd = styled.kbd`
  box-shadow: 0 0.1rem 0.2rem rgba(0, 0, 0, 0.2);
  background-color: var(--widget-background);
  border: 1px solid var(--widget-border);
  font-family: monospace;
  padding: 0.2rem 0.4rem;
  border-radius: 0.3rem;
  display: inline-block;
  font-size: 0.85em;
  line-height: 1.4;
  margin: 0;
`;

/**
 * Kbd Component.
 *
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The content to display inside the Kbd component.
 * @returns {JSX.Element} A styled kbd element.
 *
 * @example
 * // Usage:
 * <Kbd>Ctrl</Kbd>
 */
const Kbd = ({ children }) => {
  return <StyledKbd>{children}</StyledKbd>;
};

export default Kbd;
