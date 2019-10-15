function redirectToOptions(){
  browser.storage.local.set({privacy:true})
  browser.runtime.openOptionsPage();
  console.log("To options");
}
document.getElementById('toOptions').addEventListener('click',redirectToOptions)
let websiteLinks = document.querySelectorAll('a.website');
Array.prototype.forEach.call(websiteLinks, function (result, index) {
  result.href = browser.runtime.getManifest().homepage_url;
})
