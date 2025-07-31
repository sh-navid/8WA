import React from 'react';
import styled from 'styled-components';

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: var(--input-foreground);
  margin-left: auto;
  position: absolute;
  top: 0.25rem;
`;

const CheckboxLabel = styled.label`
  cursor: pointer;
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
    content: '\\2713';
    font-size: 1rem;
    color: var(--input-foreground);
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
`;

function Checkbox({ label, checked, onChange, position }) {
    return (
        <CheckboxContainer style={{ left: position }}>
            <CheckboxLabel>
                {label}
                <CheckboxInput
                    type="checkbox"
                    checked={checked}
                    onChange={onChange}
                />
            </CheckboxLabel>
        </CheckboxContainer>
    );
}

export default Checkbox;