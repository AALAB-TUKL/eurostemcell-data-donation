function redirectToOptions(){
  browser.runtime.openOptionsPage();
  console.log("To options");
}
document.getElementById('toOptions').addEventListener('click',redirectToOptions)
