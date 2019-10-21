let lastSubmit
let donation = document.getElementById("donation");
let manifest = browser.runtime.getManifest();
let tabs = {};
let relevant = ['results','ads','topstories'];
for (string of relevant) {
  tabs[string] = document.getElementById(string);
}

browser.storage.local.get('lastSubmit').then((d)=>{
  showSubmission(d.lastSubmit);
})

function showSubmission(data){
  if (typeof data == 'undefined' || JSON.stringify(data) == '{}' ) {
    donation.textContent = 'No submission found, please wait for the next donation interval and assure that you filled out the survey';
  }else {
    document.getElementById('time').textContent = 'Your last donation was submitted on ' + data.search_date +' following a search for \''+decodeURIComponent(data.keyword)+'\'.'+'\nSee below for more Details.'
    document.getElementById('website').href = manifest.homepage_url;
    for (cat of relevant) {
      if (data[cat].length == 0) {
        tabs[cat].textContent = "There was nothing sent in this category.";
        continue;
      }
      var table = document.createElement("table");
      table.classList.add('table');
      let header = table.createTHead();
      let htr = table.insertRow(-1);
      switch (cat) {
        case "results":
          htr.insertCell(-1).textContent = "Position";
          htr.insertCell(-1).textContent = "Title"
          break;
        case "ads":
        htr.insertCell(-1).textContent = "Company";
        htr.insertCell(-1).textContent = "Title"
          break;
        case "topstories":
        htr.insertCell(-1).innerHTML = "Publisher";
        htr.insertCell(-1).innerHTML = "Title"
          break;
        default:
      }
      for (let i in data[cat]) {
        let tr = table.insertRow(-1);
        switch (cat) {
          case "results":
            tr.insertCell(-1).textContent = i;
            break;
          case "ads":
            tr.insertCell(-1).textContent = data[cat][i].name;
            break;
          case "topstories":
            tr.insertCell(-1).textContent = data[cat][i].author;
            break;
          default:
        }

        let tabCell = tr.insertCell(-1);
        tabCell.textContent = data[cat][i]['title'];
        }
        tabs[cat].appendChild(table);
      }
    }
}

function openSubmission(e) {
// Declare all variables
  let i, tabcontent, tablinks;
  // Get all elements with class="tabcontent" and hide them
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  // Get all elements with class="tablinks" and remove the class "active"
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  // Show the current tab, and add an "active" class to the button that opened the tab
  let submission = document.getElementById(e.currentTarget.name);
  submission.style.display = "block";
  submission.className += " active";
}
function please (evt,key){
  console.log(evt);
  console.log(key);
}
Array.prototype.forEach.call(document.querySelectorAll("button"), function (button) {button.addEventListener("click", openSubmission)});
