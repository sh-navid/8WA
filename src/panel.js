let msgArray = [
  {
    role: "assistant",
    content: "${rules}",
  },
];

function clearChat() {
  msgArray = [
    {
      role: "system",
      content: `Rules: ${rules}`,
    },
  ];
  $("#chatMessages").html("");
}

function highlightCode(codeElement, code) {
  Prism.highlightElement(codeElement[0]);
}

function addMessage(text, fromUser = true) {
  const msgDiv = $("<div>")
    .addClass("msg-container")
    .addClass("message")
    .addClass(fromUser ? "user" : "bot");

  if (text.length > 150 && fromUser) {
    const shortText = text.substring(0, 150);
    const remainingText = text.substring(150);

    const shortSpan = $("<span>").addClass("short-text").text(shortText);
    const expandButton = $("<button>").text("Expand").addClass("more-button");
    const collapseButton = $("<button>")
      .text("Collapse")
      .addClass("more-button")
      .hide();
    const fullSpan = $("<span>")
      .addClass("remaining-text")
      .text(remainingText)
      .hide();

    expandButton.click(() => {
      fullSpan.slideDown("fast");
      expandButton.hide();
      collapseButton.show();
    });

    collapseButton.click(() => {
      fullSpan.slideUp("fast");
      expandButton.show();
      collapseButton.hide();
    });

    msgDiv.append(shortSpan, expandButton, fullSpan, collapseButton);
  } else {
    msgDiv.text(text);
  }

  $("#chatMessages")
    .append(msgDiv)
    .scrollTop($("#chatMessages")[0].scrollHeight);
}

function addBotMessage(response) {
  const msgDiv = $("<div>").addClass("message bot");
  if (response?.choices?.[0]?.message?.content) {
    let content = response.choices[0].message.content;

    const markedContent = marked.parse(content);

    msgDiv.html(markedContent);
    $("#chatMessages")
      .append(msgDiv)
      .scrollTop($("#chatMessages")[0].scrollHeight);

    msgDiv.find("pre code").each(function () {
      const codeElement = $(this);
      const code = codeElement.text();

      highlightCode(codeElement, code);

      codeElement.parent().css("position", "relative").append(`
        <div class="code-btns-container">
          <img src="${btnOpenCodeFile}" alt="Open Code File"  />
          <img src="${btnAppend}"       alt="Append in File"  />
          <img src="${btnReplace}"      alt="Replace File"    />
          <img src="${btnCopy}"         alt="Copy File"       />
        </div>
      `);

      const preElement = codeElement.parent();
      preElement.css({
        position: "relative",
        "max-height": "200px",
        overflow: "hidden",
      });

      const moreButton = $("<button>").text("More...").addClass("more-button");
      const lessButton = $("<button>")
        .text("Less...")
        .addClass("more-button")
        .hide();

      // Modified CSS for buttons
      const buttonContainer = $("<div>")
        .addClass("code-buttons-container") // added to class name to not confuse the other .code-btns-container
        .css({
          "text-align": "center", // Center the buttons horizontally
          "margin-top": "5px",
          "margin-bottom": "0px",
          position: "absolute",
          top: "0", // Position at the top
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          "z-index": 1, // Ensure buttons are above the content
        })
        .append(moreButton)
        .append(lessButton);

      preElement.append(buttonContainer);

      function setButtonPosition(isExpanded) {
        buttonContainer.css({
          position: "absolute",
          top: "0",
          left: "50%",
          transform: "translateX(-50%)",
          "z-index": 1, // Ensure buttons are above the content
        });
      }

      moreButton.click(() => {
        preElement.animate(
          { "max-height": preElement[0].scrollHeight },
          "fast"
        ); // Set max-height to scrollHeight
        moreButton.hide();
        lessButton.show();
        // Modified CSS: set position to relative and adjust transform to none and left to 0
        setButtonPosition(true);
      });

      lessButton.click(() => {
        preElement.animate({ "max-height": "200px" }, "fast");
        lessButton.hide();
        moreButton.show();
        // Modified CSS: set position to absolute, bottom to 0, left to 50%, and use transform
        setButtonPosition(false);
      });

      codeElement
        .parent()
        .find(".code-btns-container img:eq(0)")
        .click(() => {
          vscode.postMessage({ command: "openCodeFile", code });
        });
      codeElement
        .parent()
        .find(".code-btns-container img:eq(1)")
        .click(() => {
          vscode.postMessage({ command: "appendToActiveFile", code });
        });
      codeElement
        .parent()
        .find(".code-btns-container img:eq(2)")
        .click(() => {
          vscode.postMessage({ command: "replaceActiveFile", code });
        });
      codeElement
        .parent()
        .find(".code-btns-container img:eq(3)")
        .click(() => {
          vscode.postMessage({ command: "copyCodeBlock", code });
        });
    });
    msgArray.push({ role: "assistant", content: markedContent });
  } else {
    msgDiv.text("No response from bot.");
    $("#chatMessages")
      .append(msgDiv)
      .scrollTop($("#chatMessages")[0].scrollHeight);
  }
}

async function sendToLLM(message) {
  msgArray.push({ role: "user", content: message });

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
              "Error communicating with the LLM: " +
              error.message +
              ` <a href="#" onclick="proceedToSend('Retry...','Please review chats and respond again')">Retry...</a>`,
          },
        },
      ],
    };
  }
}

window.addEventListener("message", (event) => {
  const message = event.data;

  switch (message.command) {
    case "addTextToChat":
      msgArray.push({ role: "user", content: message.text });
      addMessage(message.text, true);
      break;
  }
});

async function proceedToSend(userText, combinedMessage) {
  addMessage(userText);
  $("#userInput").val("");
  $("#sendButton").prop("disabled", true);
  const response = await sendToLLM(combinedMessage);

  addBotMessage(response);
  $("#sendButton").prop("disabled", false).focus();
}

/**/
document.addEventListener("DOMContentLoaded", function () {
  clearChat();

  $("#userInput").on("keydown", (e) => {
    if (e.key === "Enter") {
      $("#sendButton").click();
      e.preventDefault();
    }
  });

  $("#sendButton").click(() => {
    let text = $("#userInput").val().trim();
    if (!text) return;

    if (text === "/time") {
      const now = new Date().toLocaleTimeString();
      text = `Current time: ${now}`;
    } else if (text === "/date") {
      const today = new Date().toLocaleDateString();
      text = `Current date: ${today}`;
    } else if (text === "/structure") {
      text = `The /structure feature is not implemented yet`;
    } else if (text === "/task") {
      text = `The /task feature is not implemented yet`;
    } else if (text === "/color") {
      text = `The /color feature is not implemented yet`;
    } else if (text === "/calendar") {
      text = `the /calendar feature is not implemented yet`;
    }

    proceedToSend(text, text);
  });
});
