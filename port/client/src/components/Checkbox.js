import styled from "styled-components";
import React from "react";

const CheckboxContainer = styled.div`
  display: flex; /* Changed to flex to align items horizontally */
  align-items: center; /* Vertically align items in the container */
  gap: 0.3rem;
  font-size: 0.85rem;
  color: var(--input-foreground);
  margin-left: auto;
  position: absolute;
  top: 0.25rem;
`;

const CheckboxLabel = styled.label`
  cursor: pointer;
  display: flex; /* Ensure label content is also a flex container for alignment */
  align-items: center; /* Vertically align label content */
`;

const CheckboxInput = styled.input`
  appearance: none;
  width: 1.2rem;
  height: 1.2rem;
  background-color: var(--input-background);
  border: 1px solid var(--widget-border);
  border-radius: 0.2rem;
  cursor: pointer;
  position: relative;

  &:checked {
    background-color: var(--textLink-foreground);
    border-color: var(--textLink-foreground);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px var(--focusBorder);
  }

  &:checked::before {
    content: "\\2713";
    font-size: 1rem;
    color: var(--input-foreground);
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
  margin: 0; /* Reset default input margins to ensure proper alignment */
`;

function Checkbox({ label, checked, onChange, position }) {
  return (
    <CheckboxContainer style={{ left: position }}>
      <CheckboxLabel>
        <CheckboxInput type="checkbox" checked={checked} onChange={onChange} />
        &nbsp;
        {label}
      </CheckboxLabel>
    </CheckboxContainer>
  );
}

export default Checkbox;
