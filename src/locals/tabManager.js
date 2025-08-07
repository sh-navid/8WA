// eslint-disable-next-line no-unused-vars
const locals = {
  openTab: (tabId) => {
    // Hide all tabs
    const tabs = document.querySelectorAll(".tab-content");
    tabs.forEach((tab) => (tab.style.display = "none"));

    // Deactivate all buttons
    const buttons = document.querySelectorAll(".tab-button");
    buttons.forEach((button) => button.classList.remove("active"));

    // Show the selected tab
    document.getElementById(tabId).style.display = "flex"; // or "block" depending on your layout
    // Activate the button
    document
      .querySelector(`.tab-button[onclick="locals.openTab('${tabId}')"]`)
      .classList.add("active");
  },
};