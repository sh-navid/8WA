let tabs;
let addBtn;
let tabCount = 1;

window.onload = function () {
  tabs = $("tabs");
  addBtn = tabs.find(".addTab");
  addBtn.on("click", createTab);
  tabs.find("tab").on("click", function() {
    setActiveTab($(this));
  });
  setActiveTab(tabs.find("tab:first-child"));
};

function createTab() {
  const newTab = $($(".tabTemplate").html());
  newTab.find(".tabTitle").html("Chat " + ++tabCount);
  newTab.find(".remTab").on("click", () => newTab.remove());
  newTab.on("click", () => setActiveTab(newTab));
  tabs.append(newTab);
}

function setActiveTab(tab) {
  tabs.find("tab").removeClass("active");
  tab.addClass("active");
}