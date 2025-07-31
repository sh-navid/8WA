import React from 'react';
import {
    InputWrapper,
    AgentMode,
    AgentModeLabel,
    AgentModeCheckbox,
    HpMode,
    HpModeLabel,
    HpModeCheckbox,
    InputWrapperTextarea,
    InputButtonWrapper,
    InputWrapperButton
} from './StyledComponents';

import clear from '../assets/clear.png';
import send from '../assets/send.png';

const InputArea = ({
    userInput,
    setUserInput,
    clearChat,
    handleUserInputKeyDown,
    handleSendButtonClick,
    model
}) => {
    return (
        <InputWrapper>
            <AgentMode>
                <AgentModeCheckbox type="checkbox" id="agentModeCheckbox" />
                <AgentModeLabel htmlFor="agentModeCheckbox">Agent Mode</AgentModeLabel>
            </AgentMode>

            <HpMode>
                <HpModeCheckbox type="checkbox" id="hpModeCheckbox" />
                <HpModeLabel htmlFor="hpModeCheckbox">Harmonic Popcorn</HpModeLabel>
            </HpMode>
            <InputWrapperTextarea
                id="userInput"
                placeholder="Type your prompt or use /command"
                autoComplete="off"
                aria-label="Message input"
                autoFocus
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleUserInputKeyDown}
            />
            <InputButtonWrapper>
                <InputWrapperButton
                    src={clear}
                    onClick={clearChat}
                    title="Clear Chat"
                />

                <InputWrapperButton
                    src={send}
                    id="sendButton"
                    title={`Send Message to ${model}`}
                    onClick={handleSendButtonClick}
                />
            </InputButtonWrapper>
        </InputWrapper>
    );
};

export default InputArea;
