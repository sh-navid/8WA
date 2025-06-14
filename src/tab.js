let tabs;
let addBtn;
let tabCount = 1;

window.onload = function () {
  tabs = $("tabs");
  addBtn = tabs.find(".addTab");
  addBtn.on("click", createTab);

  // Add click event listeners to existing tabs
  tabs.find("tab").on("click", function() {
    setActiveTab($(this));
  });

  // Initialize active tab (set first tab as active by default)
  setActiveTab(tabs.find("tab:first-child"));
};

function createTab() {
  const newTabTemplate = $(".tabTemplate").html();
  const newTab = $(newTabTemplate);
  newTab.find(".tabTitle").html("Chat " + ++tabCount);
  newTab.find(".remTab").on("click", () => {
    newTab.remove();
  });
  newTab.on("click", () => {
    setActiveTab(newTab);
  });
  tabs.append(newTab);
}

function setActiveTab(tab) {
  // Remove active class from all tabs
  tabs.find("tab").removeClass("active");

  // Set active class on the clicked tab
  tab.addClass("active");

  // Add functionality to load content for each tab here
  // based on which tab is active
  // For example: loadTabContent(tab.find(".tabTitle").html());
}
