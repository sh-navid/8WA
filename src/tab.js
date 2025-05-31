let tabs;
let addBtn;
let tabCount = 1;

window.onload = function () {
  tabs = $("tabs");
  addBtn = tabs.find(".addTab");
  addBtn.on("click", createTab);
};

function createTab() {
  const newTabTemplate = $(".tabTemplate").html();
  const newTab = $(newTabTemplate);
  newTab.find(".tabTitle").html("Chat " + ++tabCount);
  newTab.find(".remTab").on("click", () => {
    newTab.remove();
  });
  tabs.append(newTab);
}
