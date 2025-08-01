/* [[port/client/src/components/Message.js]] */
import { useState } from 'react';

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

export default Message;
