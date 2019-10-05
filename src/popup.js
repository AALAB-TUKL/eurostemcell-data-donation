console.log("popup.js loaded");
document.getElementById('home').href = browser.runtime.getManifest().homepage_url;
async function saveOptions(e){
  e.preventDefault();
  let box = document.querySelector("popup_check");
  // if (box.checked) {
  //   await browser.storage.local.set({hide_popup:box.checked});
  // }
  browser.storage.local.get("hide_popup").then(e=>{console.log("popup: " + e);})
  window.close();
}
console.log(document.querySelector("body"));
document.querySelector("form").addEventListener("submit", saveOptions);
