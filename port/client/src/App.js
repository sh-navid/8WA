import { useState, useEffect, useRef } from 'react';
import * as marked from 'marked';
import Prism from 'prismjs';
import 'prismjs/themes/prism.css';
import styled, { keyframes } from 'styled-components';

import Kbd from './components/Kbd';
import Space from './components/Space';
import InputArea from './components/InputArea';
import CommandPanel from './components/CommandPanel';
import Message from './components/Message';

import logo4 from './assets/logo2.png';

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

const fadeOut = keyframes`
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-20px);
    display: none;
  }
`;

export const LogoHolder = styled.div`
  width: 100%;
  text-align: center;
  margin-top: 9rem;
  transition: all 300ms;
  opacity: ${props => (props.show ? 1 : 0)};
  transform: ${props => (props.show ? 'translateY(0)' : 'translateY(-20px)')};
  animation: ${props => (!props.show ? fadeOut : 'none')} 0.3s ease-out forwards;
  display: ${props => (props.show ? 'block' : 'none')};
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



function App() {
    const [msgArray, setMsgArray] = useState([{ role: "assistant", content: rules }]);
    const [userInput, setUserInput] = useState("");
    const [chatMessages, setChatMessages] = useState([]);
    const [commandPanelVisible, setCommandPanelVisible] = useState(false);
    const [filteredCommands, setFilteredCommands] = useState([]);
    const chatMessagesRef = useRef(null);
    const [showLogo, setShowLogo] = useState(true);

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

    useEffect(() => {
        if (chatMessages.length > 0) {
            setShowLogo(false);
        } else {
            setShowLogo(true);
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
        setShowLogo(true);
    };

    const addMessage = (file, text, fromUser = true, type = null) => {
        setChatMessages(prevMessages => {
            const newMessages = [...prevMessages, { file, text, fromUser, type }];
            return newMessages;
        });
        setShowLogo(false);
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
            setShowLogo(false);
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

    return (
        <Body>
            <LogoHolder show={showLogo}>
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
                <CommandPanel
                    filteredCommands={filteredCommands}
                    setUserInput={setUserInput}
                    hideCommandPanel={hideCommandPanel}
                    handleSendButtonClick={handleSendButtonClick}
                />
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