let confirmContent;
let confirmModal;

window.onload = function () {
  confirmContent = $("#confirmContent");
  confirmModal = $("#confirmModal");
};

const showConfirmModal = (content) => {
  confirmContent.html(content);
  confirmModal.show();
  $("#confirmYes")
    .off("click")
    .on("click", async () => {
      confirmModal.hide();
      await proceedToSend(text, combinedMessage);
    });
  $("#confirmNo")
    .off("click")
    .on("click", () => confirmModal.hide());
};
