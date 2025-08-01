import styled from 'styled-components';
import React from 'react';

/**
 * A spacing component that adds vertical space between elements.
 *
 * The height of the space can be customized using the `size` prop.
 */
const StyledSpace = styled.div`
  height: ${(props) => props.size || '1rem'};
  display: block;
`;

/**
 * Space Component.
 *
 * @param {Object} props - Component properties.
 * @param {string} props.size - The height of the space (e.g., '2rem', '10px').  Defaults to '1rem'.
 * @returns {JSX.Element} A styled div element representing the space.
 *
 * @example
 * // Usage:
 * <Space size="2rem" /> // Creates a space with a height of 2rem.
 * <Space /> // Creates a space with a default height of 1rem.
 */
const Space = ({ size }) => {
  return <StyledSpace size={size} />;
};

export default Space;
