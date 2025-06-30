/**/
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
    .addClass("message")
    .addClass(fromUser ? "user" : "bot");

  if (text.length > 150 && fromUser) {
    const shortText = text.substring(0, 150);
    const remainingText = text.substring(150);

    const shortSpan = $("<span>").text(shortText);
    const moreButton = $("<button>").text("More...").addClass("more-button");
    const fullSpan = $("<span>").text(remainingText).hide();

    moreButton.click(() => {
      fullSpan.show();
      moreButton.hide();
    });

    msgDiv.append(shortSpan, moreButton, fullSpan);
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
    }

    proceedToSend(text, text);
  });
});