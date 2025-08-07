const commandPanel = {
  visible: false,
  filteredCommands: [],
  commands: [
    { name: "/tree", description: "Build project structure" },
    { name: "/commit", description: "Generate commit message" },
    {
      name: "/break",
      description: "Think to break project into smaller more clear structure",
    },
  ],

  show: function (filter = "") {
    this.filteredCommands = this.commands.filter((command) =>
      command.name.startsWith(filter)
    );

    if (!this.visible) {
      const $commandPanel = $("<div>")
        .attr("id", "commandPanel")
        .addClass("command-panel");

      this.update($commandPanel);

      $("body").append($commandPanel);
      this.visible = true;
    } else {
      const $commandPanel = $("#commandPanel");
      this.update($commandPanel);
    }
  },

  update: function ($commandPanel) {
    $commandPanel.empty();

    this.filteredCommands.forEach((command) => {
      const $commandButton = $("<button>")
        .text(command.name + " - " + command.description)
        .addClass("command-button")
        .click(() => {
          $("#userInput").val(command.name);
          this.hide();
          $("#sendButton").click();
        });
      $commandPanel.append($commandButton);
    });

    if (this.filteredCommands.length === 0) {
      $commandPanel.append(
        $("<div>")
          .text("No matching commands")
          .addClass("no-commands")
      );
    }
  },

  hide: function () {
    if (this.visible) {
      $("#commandPanel").remove();
      this.visible = false;
    }
  },
};
