let websiteURL = browser.runtime.getManifest().homepage_url;

document.getElementById("contact").href = websiteURL + '#paragraph-1579';
document.getElementById("FAQ").href = websiteURL + '#paragraph-1575';
document.getElementById("code").href = 'https://github.com/AALAB-TUKL/eurostemcell-data-donation'
document.getElementById("privacy").href = browser.runtime.getURL('/src/study_privacy.html');

let websiteLinks = document.querySelectorAll('a.website');
Array.prototype.forEach.call(websiteLinks, function (result, index) {
  result.href = websiteURL;
})
