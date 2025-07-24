/*[[src/components/tabManager.js]]*/
class TabManager {
  constructor(tabsSelector, addBtnSelector, tabTemplateSelector) {
    this.tabs = $(tabsSelector);
    this.addBtn = this.tabs.find(addBtnSelector);
    this.tabTemplate = $(tabTemplateSelector);
    this.tabCount = 1;
    this.init();
  }

  init() {
    this.addBtn.on("click", this.createTab.bind(this));
    this.tabs.find(".tab").on("click", (event) => {
      this.setActiveTab($(event.currentTarget));
    });
    this.setActiveTab(this.tabs.find(".tab:first-child"));
  }

  createTab() {
    const newTab = $(this.tabTemplate.html());
    newTab.find(".tabTitle").html("Chat " + ++this.tabCount);
    newTab.find(".remTab").on("click", () => newTab.remove());
    newTab.on("click", (event) => {
      this.setActiveTab($(event.currentTarget));
    });
    this.tabs.append(newTab);
  }

  setActiveTab(tab) {
    this.tabs.find(".tab").removeClass("active");
    tab.addClass("active");
  }
}

export default TabManager;
