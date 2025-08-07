let commandPanelVisible = false;
let filteredCommands = [];

const commands = [
  { name: "/tree", description: "Build project structure" },
  { name: "/commit", description: "Generate commit message" },
  {
    name: "/break",
    description: "Think to break project into smaller more clear structure",
  },
];

function showCommandPanel(filter = "") {
  filteredCommands = commands.filter((command) =>
    command.name.startsWith(filter)
  );

  if (!commandPanelVisible) {
    const commandPanel = $("<div>")
      .attr("id", "commandPanel")
      .addClass("command-panel")

    updateCommandPanel(commandPanel);

    $("body").append(commandPanel);
    commandPanelVisible = true;
  } else {
    const commandPanel = $("#commandPanel");
    updateCommandPanel(commandPanel);
  }
}

function updateCommandPanel(commandPanel) {
  commandPanel.empty();

  filteredCommands.forEach((command) => {
    const commandButton = $("<button>")
      .text(command.name + " - " + command.description)
      .addClass("command-button")
      .click(() => {
        $("#userInput").val(command.name);
        hideCommandPanel();
        $("#sendButton").click();
      });
    commandPanel.append(commandButton);
  });

  if (filteredCommands.length === 0) {
    commandPanel.append(
      $("<div>").text("No matching commands").css({
        padding: "5px",
        "text-align": "center",
        color: "var(--vscode-disabledForeground)",
      })
    );
  }
}

function hideCommandPanel() {
  if (commandPanelVisible) {
    $("#commandPanel").remove();
    commandPanelVisible = false;
  }
}