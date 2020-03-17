function redirectToOptions(){
  browser.storage.local.set({privacy:true})
  browser.runtime.openOptionsPage();
  console.log("To options");
}

document.getElementById('toOptions').addEventListener('click',redirectToOptions)
