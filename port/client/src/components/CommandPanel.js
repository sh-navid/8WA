import React from 'react';

const CommandPanel = ({ filteredCommands, setUserInput, hideCommandPanel, handleSendButtonClick }) => {
    return (
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
    );
};

export default CommandPanel;
