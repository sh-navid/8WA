import styled from 'styled-components';

export const Body = styled.div`
  background-color: var(--background);
  color: var(--foreground);
  margin: 0;
  padding: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  user-select: none;
`;

export const LogoHolder = styled.div`
  width: 100%;
  text-align: center;
  margin-top: 8rem;
  transition: all 300ms;
`;

export const ChatMessages = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  padding: 1rem;
  margin: 0.25rem !important;
  border-radius: 0.25rem;
  gap: 0.1rem;
  overflow-y: auto;
  scrollbar-width: auto;
  user-select: text;

  &::-webkit-scrollbar {
    width: 0.625rem;
  }

  &::-webkit-scrollbar-track {
    background-color: var(--input-background);
    border-radius: 1rem;
  }

  &::-webkit-scrollbar-thumb {
    background-color: var(--scrollbarSlider-background);
    border-radius: 1rem;
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: var(--scrollbarSlider-hoverBackground);
  }
`;

export const InputWrapper = styled.div`
  position: fixed;
  bottom: 0.5rem;
  left: 50%;
  z-index: 1000;
  display: flex;
  align-items: center;
  max-width: 600px;
  background-color: var(--widget-background);
  border: 1px solid var(--widget-border);
  border-radius: 0.5rem;
  gap: 0.5rem;
  transform: translateX(-50%);
  box-shadow: 0 4px 12px var(--shadow, rgba(0, 0, 0, 0.15));
  width: 97%;
  padding: 0.4rem 0.65rem;
`;

export const AgentMode = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: var(--input-foreground);
  margin-left: auto;
  position: absolute;
  top: 0.25rem;
  left: 1rem;
`;

export const AgentModeLabel = styled.label`
  cursor: pointer;
`;

export const AgentModeCheckbox = styled.input`
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

export const HpMode = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: var(--input-foreground);
  margin-left: auto;
  position: absolute;
  top: 0.25rem;
  left: 8rem;
`;

export const HpModeLabel = styled.label`
  cursor: pointer;
`;

export const HpModeCheckbox = styled.input`
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

export const InputWrapperTextarea = styled.textarea`
  background-color: transparent;
  border: none;
  color: var(--input-foreground);
  font-size: 0.8rem;
  padding: 0.75rem 1rem;
  min-height: 8rem;
  max-height: 20rem;
  flex-grow: 1;
  outline: none;
  resize: vertical;
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbarSlider-background) var(--input-background);
  margin-top: 1.5rem !important;

  border: 1px solid black;

  &::-webkit-scrollbar {
    width: 0.625rem;
  }

  &::-webkit-scrollbar-track {
    background-color: var(--input-background);
    border-radius: 1rem;
  }

  &::-webkit-scrollbar-thumb {
    background-color: var(--scrollbarSlider-background);
    border-radius: 1rem;
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: var(--scrollbarSlider-hoverBackground);
  }
`;

export const InputButtonWrapper = styled.div`
  position: absolute !important;
  top: 0.6rem;
  right: 1.2rem;
`;

export const InputWrapperButton = styled.img`
  background-color: transparent !important;
  color: var(--button-foreground);
  border: none !important;
  white-space: nowrap;
  font-size: 1.2rem;
  font-weight: 600;
  padding: 0.5rem;
  cursor: pointer;
  width: 15rem;
`;
