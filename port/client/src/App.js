import React, { useState, useEffect, useRef } from 'react';
import * as marked from 'marked';
import Prism from 'prismjs';
import 'prismjs/themes/prism.css';

import Kbd from './components/Kbd';
import Space from './components/Space';
import InputArea from './components/InputArea';

import btnOpenCodeFile from './assets/btn-open-code-file.png';
import btnReplace from './assets/btn-replace.png';
import btnCopy from './assets/btn-copy.png';
import btnDiff from './assets/btn-diff.png';
import btnUndo from './assets/btn-undo.png';
import clear from './assets/clear.png';
import logo4 from './assets/logo2.png';
import send from './assets/send.png';
import styled from 'styled-components';

// Mock dynamic variables for demonstration
const token = "sampleToken";
const model = "GPT-3";
const path = "/sample/path";
const rules = "Sample rules here";

const commands = [
    { name: "/tree", description: "Build project structure" },
    { name: "/commit", description: "Generate commit message" },
    {
        name: "/break",
        description: "Think to break project into smaller more clear structure" },
];










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


function App() {
    const [msgArray, setMsgArray] = useState([{ role: "assistant", content: rules }]);
    const [userInput, setUserInput] = useState("");
    const [chatMessages, setChatMessages] = useState([]);
    const [commandPanelVisible, setCommandPanelVisible] = useState(false);
    const [filteredCommands, setFilteredCommands] = useState([]);
    const [originalCodeBlocks, setOriginalCodeBlocks] = useState({});
    const chatMessagesRef = useRef(null);

    const vscode = typeof window !== 'undefined' ? window.vscode : undefined;

    useEffect(() => {
        if (typeof window !== 'undefined' && window.addEventListener) {
            window.addEventListener("message", handleWindowMessage);
        }
        return () => {
            if (typeof window !== 'undefined' && window.removeEventListener) {
                window.removeEventListener("message", handleWindowMessage);
            }
        };
    }, []);

    useEffect(() => {
        clearChat();
    }, []);

    useEffect(() => {
        if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
    }, [chatMessages]);


    const handleWindowMessage = (event) => {
        const message = event.data;

        switch (message.command) {
            case "addTextToChat":
                addMessage(message.path, message.raw, true);
                break;
            case "receiveProjectStructure":
                const structure = message.structure;
                addMessage(message.path, structure, false, "structure");
                proceedToSend(message.path, structure, structure, false, "structure");
                break;
            case "receiveProjectPreferences":
                const preferences = message.preferences;
                addMessage(message.path, preferences, false, "preferences");
                proceedToSend(message.path, preferences, preferences, false, "preferences");
                break;
            default:
                break;
        }
    };

    const showCommandPanel = (filter = "") => {
        const filtered = commands.filter((command) =>
            command.name.startsWith(filter)
        );
        setFilteredCommands(filtered);
        setCommandPanelVisible(true);
    };

    const hideCommandPanel = () => {
        setCommandPanelVisible(false);
    };

    const clearChat = () => {
        setMsgArray([{ role: "assistant", content: `Rules: ${rules}` }]);
        setChatMessages([]);
    };

    const addMessage = (file, text, fromUser = true, type = null) => {
        setChatMessages(prevMessages => {
            const newMessages = [...prevMessages, { file, text, fromUser, type }];
            return newMessages;
        });
    };


    const highlightCode = (code) => {
        return Prism.highlight(code, Prism.languages.javascript, 'javascript');
    };

    const addBotMessage = (response) => {
        if (response?.choices?.[0]?.message?.content) {
            let content = response.choices[0].message.content;
            const markedContent = marked.parse(content);

            setChatMessages(prevMessages => {
                const newMessages = [...prevMessages, { content: markedContent, fromUser: false, type: 'bot' }];
                return newMessages;
            });

            setMsgArray(prevMsgArray => {
                return [...prevMsgArray, { role: "assistant", content: markedContent }];
            });
        } else {
            addMessage("", "No response from bot.", false);
        }
    };

    async function sendToLLM(message) {
        setMsgArray(prevMsgArray => [...prevMsgArray, { role: "user", content: message }]);

        try {
            const response = await fetch(`${path}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    model: `${model}`,
                    messages: msgArray,
                }),
            });
            if (!response.ok)
                throw new Error(`${response.status} - ${await response.text()}`);
            return await response.json();
        } catch (error) {
            console.error("Error:", error);
            return {
                choices: [
                    {
                        message: {
                            content:
                                "Error communicating with AI: " +
                                error.message +
                                ` <a href="#" onclick="proceedToSend('','Retry...','Please review chats and respond again')">Retry...</a>`,
                        },
                    },
                ],
            };
        }
    }

    const proceedToSend = async (file, userText, combinedMessage, send = true, type = null) => {
        addMessage(file, userText, true, type);
        setUserInput("");
        if (send) {
            const response = await sendToLLM(combinedMessage);
            addBotMessage(response);
        }
    };

    const handleUserInputKeyDown = (e) => {
        if (e.key === "Enter") {
            handleSendButtonClick();
            e.preventDefault();
            hideCommandPanel();
        } else if (e.key === "Escape") {
            hideCommandPanel();
        } else if (e.key === "/") {
            if (userInput === "") {
                showCommandPanel("/");
            } else {
                hideCommandPanel();
            }
        } else {
            if (userInput.startsWith("/")) {
                const filterText = userInput + e.key;
                showCommandPanel(filterText);
            } else {
                hideCommandPanel();
            }
        }
    };

    const handleSendButtonClick = () => {
        let text = userInput.trim();
        if (!text) return;

        let prompt = "";

        switch (text) {
            case "/tree":
                if (vscode) {
                    vscode.postMessage({ command: "buildProjectStructure" });
                }
                return;
            case "/commit":
                text = `Generating commit message...`;
                prompt = `Do not output any code or description; just make a commit message`;
                proceedToSend("", text, prompt, true);
                return;
            case "/break":
                if (vscode) {
                    vscode.postMessage({ command: "buildProjectStructure" });
                    setTimeout(() => {
                        vscode.postMessage({ command: "buildPreferencesStructure" });
                    }, 1000);
                    setTimeout(() => {
                        text = `Thinking about project structure...`;
                        prompt = `Do not output any code; Think about how to make project structure more clean by moving files, methods etc to repositories, services, helpers, components, views. models and such.`;
                        proceedToSend("", text, prompt, true);
                    }, 2000);
                }
                return;
            default:
                proceedToSend("", text, text, true);
                break;
        }
    };

    //Component for rendering each message
    const Message = ({ msg }) => {
        const [expanded, setExpanded] = useState(false);

        if (msg.type === 'structure') {
            return (
                <pre className={`msg-container message ${msg.fromUser ? "user" : "bot"}`}>
                    {msg.file && <div className='code-block-file-name'>{msg.file}</div>}
                    {msg.text}
                </pre>
            );
        }

        if (msg.type === 'bot') {
            return (
                <div className="message bot">
                    <div dangerouslySetInnerHTML={{ __html: msg.content }} />
                </div>
            );
        }


        return (
            <div className={`msg-container message ${msg.fromUser ? "user" : "bot"}`}>
                {msg.file && <div className='code-block-file-name'>{msg.file}</div>}
                {
                    msg.text.length > 100 && msg.fromUser ? (
                        <>
                            <span className="short-text">{expanded ? msg.text : msg.text.substring(0, 100)}</span>
                            {
                                !expanded && msg.text.length > 100 && (
                                    <button className="more-button" onClick={() => setExpanded(true)}>Expand</button>
                                )
                            }
                            {
                                expanded && (
                                    <button className="more-button" onClick={() => setExpanded(false)}>Collapse</button>
                                )
                            }
                        </>
                    ) : (
                        msg.text
                    )
                }
            </div>
        );
    };

    return (
        <Body>
            <LogoHolder>
                <img src={logo4} alt="NaBotX Logo" width="110rem" />
                <br />
                <h3>Start to code with N8X</h3>
                <span>Type <Kbd>/</Kbd> to use commands</span>
                <br />
                <br />
                <span>Use <Kbd>Ctrl</Kbd> + <Kbd>Enter</Kbd> to send</span>
            </LogoHolder>
            <ChatMessages
                id="chatMessages"
                role="log"
                aria-live="polite"
                aria-relevant="additions"
                ref={chatMessagesRef}
            >
                {chatMessages.map((msg, index) => (
                    <Message key={index} msg={msg} />
                ))}

            </ChatMessages>
            {commandPanelVisible && (
                <div className="command-panel" style={{
                    position: 'absolute',
                    top: 'auto',
                    bottom: '6rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    {filteredCommands.length > 0 ? (
                        filteredCommands.map((command, index) => (
                            <button
                                key={index}
                                className="command-button"
                                onClick={() => {
                                    setUserInput(command.name);
                                    hideCommandPanel();
                                    handleSendButtonClick();
                                }}
                            >
                                {command.name} - {command.description}
                            </button>
                        ))
                    ) : (
                        <div style={{
                            padding: '5px',
                            textAlign: 'center',
                            color: 'var(--vscode-disabledForeground)',
                        }}>
                            No matching commands
                        </div>
                    )}
                </div>
            )}
            <Space size={"4rem"}/>

            <InputArea
                userInput={userInput}
                setUserInput={setUserInput}
                clearChat={clearChat}
                handleUserInputKeyDown={handleUserInputKeyDown}
                handleSendButtonClick={handleSendButtonClick}
                model={model}
            />
        </Body>
    );
}

export default App;
