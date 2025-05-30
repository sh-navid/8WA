const tabs = document.querySelector('tabs');  
const button = tabs.querySelector('button');    

// Function to create a new tab  
function createTab() {          
    const newTab = document.createElement('tab');          
    newTab.textContent = 'New Tab';                
    
    newTab.onclick = () => {                  
        // Remove tab when clicked                  
        tabs.removeChild(newTab);          
    };              
    
    tabs.insertBefore(newTab, button); // Insert the new tab before the button  
}    

// Add event listener for the add tab button  
button.onclick = createTab;  