let msgArray = [
  {
    role: "assistant",
    content: "${rules}",
  },
];

function clearChat() {
  msgArray = [
    {
      role: "assistant",
      content: "${rules}",
    },
  ];
  chatMessages.html("");
}
