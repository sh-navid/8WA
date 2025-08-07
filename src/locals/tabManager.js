const locals = {
  openTab: (tabId) => {
    // Hide all tabs
    $(".tab-content").hide();

    // Deactivate all buttons
    $(".tab-button").removeClass("active");

    // Show the selected tab
    $("#" + tabId).show(); // or other jQuery show methods like fadeIn, slideDown

    // Activate the button
    $(`.tab-button[onclick="locals.openTab('${tabId}')"]`).addClass("active");
  },
};
