let topLevelDomain, currentData, bp,button;
button = document.querySelector("#checkAll")
browser.storage.local.get().then((localStorageData)=>{
  currentData = localStorageData;
//check, if user has filled the form and hide form if already done
if (typeof localStorageData.user == 'undefined' || typeof localStorageData.user.formFilled == "undefined" || !localStorageData.user.formFilled) {
  document.getElementById("survey").classList.remove("hidden");
  document.getElementById("welcome").classList.remove("hidden")
  document.getElementById("thankyou").classList.add("hidden");
  console.log("survey visible");

}else{
  document.getElementById("survey").classList.add("hidden");
  document.getElementById("welcome").classList.add("hidden")
  document.getElementById("thankyou").classList.remove("hidden");
  console.log("survey hidden");
  let toHTML = 'Thanks for submitting your data. After completion of the survey, your data was sent to our servers to compute a study ID.';
  toHTML += 'With this study ID, your donation can be sent anonymously.';
  toHTML += "You can check out your last submission with a click on the plugin's icon (usually in the top right corner of the window).";
  document.getElementById('thankyou').textContent = toHTML;
  button.style.display = 'none'
  }
})


//saves all form input to local storage
function saveOptions(e) {
  e.preventDefault();
  console.log("submit clicked");

  if (validateForm()) {
    switch (document.querySelector('input[name="res"]:checked').value) {
      case 'au':
        topLevelDomain = 'com.au'
        break;
        case 'uk':
          topLevelDomain = 'co.uk'
          break;
        case 'us':
          topLevelDomain = 'com'
          break;
        case 'ca':
          topLevelDomain = 'ca'
          break;
      default:
      topLevelDomain = 'com'

    }

      browser.storage.local.set({user:
        {
        par: document.querySelector('input[name="par"]:checked').value,
        msc: document.querySelector('input[name="msc"]:checked').value,
        dia: document.querySelector('input[name="dia"]:checked').value,
        med: document.querySelector('input[name="med"]:checked').value,
        res: document.querySelector('input[name="res"]:checked').value,
        age: document.querySelector('input[name="age"]:checked').value,
        gen:  document.querySelector('input[name="gender"]:checked').value,
        cfreq: document.querySelector('input[name="c_freq"]:checked').value,
        gfreq: document.querySelector('input[name="g_freq"]:checked').value,
        con: document.querySelector('input[name="contacted"]:checked').value,
        formFilled:true
      },
         settings:Object.assign(currentData.settings,{searchProvider: 'https://www.google.'+topLevelDomain})
      })
      .then(function(){
        console.log("formFilled and saved");
        browser.runtime.sendMessage({
          action: "exit_options",
          id: browser.tabs.getCurrent().id
        }).then(()=>{location.reload();})
      })
      .catch((e)=>{console.error(e);});

    document.getElementById("survey").classList.add("hidden");
    document.getElementById("thankyou").classList.remove("hidden");
  }
}

/*Checks whether there is one checked input per div.option_item,
 (which is a survey question) and highlights missing input.
 Saves input to browser.storage.local
 */
function validateForm(){
  let option_items = document.querySelectorAll('div.option_item');
  let missingInput =[];
  let choice;
  for (var i = 0; i < option_items.length; i++) {
    choice = option_items[i].querySelector('input:checked');
    if (!(choice != null && choice != 'undefined')) {
      missingInput.push(option_items[i]);
      option_items[i].style.border= '2px solid orange';
      option_items[i].style.borderRadius= '10px';
      let submitFailed = document.getElementById('submit_failed');
      submitFailed.setAttribute("style", "padding:0px 20px; margin-left:30px; font-weight: bold; border-radius:10px; border: 2px solid orange;");
      submitFailed.innerHTML="Some questions have not been answered. Please review the survey.";
    }else{
      option_items[i].style.border= 'border-bottom: 1px solid grey;';
      option_items[i].style.borderRadius= '0px';
    }
  }
  if (missingInput.length > 0) {
    console.log(missingInput);
    // missingInput[0].scrollIntoView(true);
    window.scrollBy({top:100, behavior:'smooth'})
    return false;
  }else{
    return true;

  }
}


document.getElementById('submit').addEventListener("click", validateForm);
document.forms['survey'].addEventListener("submit", saveOptions);
// utility to check all boxes for quick testing
function checkAll(){
  Array.prototype.forEach.call(document.querySelectorAll('div.option_item'), function(item, index){item.querySelector("input").checked = true})
}

function handleResponse(message) {
  if (message.hasOwnProperty('testing') && message.testing) {
    button.addEventListener("click",checkAll);
    button.style.display = "block";
    console.log("checkAll visible");
  }else {
    console.log("checkAll not visible");
  }
}

function handleError(error) {
  console.log(`Error: ${error}`);
}
function notifyBackgroundPage(e) {
  var sending = browser.runtime.sendMessage({
    action: 'testing?'
  });
  sending.then(handleResponse, handleError);
}
notifyBackgroundPage();
