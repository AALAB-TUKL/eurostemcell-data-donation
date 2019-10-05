import {config,setConfig} from "/src/config.js";
console.log(config);

let selectors = config.selectors;
let user = config.user;
let settings = config.settings;

let localStorageData;
let lastSubmit;
let delay = 1000;
let optionsPage;

let intervalId, firstRunId;
let schedulerRunning = false;

updateLocalStorageData();

//updates globally accessible localStorageData whenever there is a storage change event
async function updateLocalStorageData(){
  let promise = browser.storage.local.get().then((data)=>{localStorageData = data})
  .then(()=>{
    if (typeof localStorageData.settings == 'undefined') {
      browser.storage.local.set({settings:settings,selectors:selectors});
    }
    console.log("updated storage data");
    console.log((typeof localStorageData == undefined) ? "localStorageData undefined" : localStorageData );return localStorageData;
  })
  .catch((e)=>{console.error(e);})
  await promise;
}

// checks if the survey was already answered and opens the options page if it has not.
// checks if the user is signed into a study and does so if this is not the case.
// returns user's study ID if the checks above return true
async function checkSettings(){
  await validateVersion();
  console.log("check data:");
  console.log(localStorageData);
  if (typeof localStorageData == "undefined" || !localStorageData.hasOwnProperty("user")|| typeof localStorageData.user.formFilled == "undefined"||!localStorageData.user.formFilled) {
      console.log("formFilled undefined or false: open options");
      optionsPage = browser.runtime.openOptionsPage();
      return false;
  }else if (typeof localStorageData.user.isSigned == "undefined" || !localStorageData.user.isSigned) {
      if(await signUpForStudy()){
        console.log("User is now signed up for Study");
      }else{
        console.log("User could not be signed up for study");
        return false;}
      }else if (localStorageData.user.isSigned) {
          console.log("User alrady signed up");
        }
  browser.browserAction.setIcon({path:'/icons/esc_plugin_icon_48.png'});
  browser.browserAction.setTitle({title:'You are signed up and the plugin is donating data every 4 hours.\nClick to see your last donation.'});
  return localStorageData.user.isSigned;
}

//signs a new user up for participation and receives the respective participant ID
function signUpForStudy(){
  console.log("Sign up for study with: ");
  console.log(JSON.stringify(localStorageData.user));
  let url = localStorageData.settings.serverAddr + '/SEW_Edinburgh_2019/newParticipant';
  let xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      console.log(this);
      try {
        let response = JSON.parse(this.responseText);
        console.log(this);
        browser.storage.local.set({
          user:{
            isSigned:true,
            formFilled:true,
            user_id:response.user_id,
            study_id:response.study_id,
            keywords:response.keywords["1"]
          }
        });
      } catch (e) {
        console.log("Sign up failed due to wrong server response: "+e);
        return false
      }
      console.log("Signed up");
      return true
    }
  };
  xhttp.onerror = ((e)=>{console.log("Sign up failed");console.error(e);return false});
  xhttp.open("POST", url);
  xhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  xhttp.send(JSON.stringify(localStorageData.user));
  //return false;
}

//opens window in which the crawl script is being executed with the passed keywords
async function runQuery(keywords){
  console.log("runQuery "+ keywords.length + " times with: "+keywords);
  browser.storage.local.get("hide_popup").then(b=>{
    if (!b.hide_popup || typeof b.hide_popup == "undefined") {
      console.log("popup shows");
      // browser.browserAction.setPopup(
      //   {popup:"./popup.html"}
      // )
    }else {
      console.log("popup hidden");
      // browser.browserAction.setPopup(
      //   {popup:null}
      // )
    }
  })
  let results = []
  let index = 0;
  let queryPromises = [];
  let shuffledKeywords;
  shuffledKeywords = shuffleArray(keywords);
  console.log(shuffledKeywords);
  for (const query of shuffledKeywords){
    index++;
    let promise = new Promise((resolve,reject)=>{
    browser.tabs.create({url:localStorageData.settings.searchProvider+'/search?q=' + query, active:false})
    .then(tab =>{
      //chrome compatibility
      // browser.tabs.executeScript(tab.id,{file: "browser-polyfill.js"});
      //visual cue that something is happening
      browser.tabs.executeScript(tab.id,{code:'document.body.style.border = "green dashed 5px";', runAt: 'document_idle'});
      //provide config data to page to be crawled
      browser.tabs.executeScript(tab.id,{code:'let selectors ='+JSON.stringify(localStorageData.selectors)+';let settings ='+JSON.stringify(localStorageData.settings)+';let user ='+JSON.stringify(localStorageData.user),runAt: 'document_idle'});
      //crawl page and save last submitted data
      lastSubmit = browser.tabs.executeScript(tab.id,{file: '/src/page-crawl.js',runAt: 'document_idle'})
      lastSubmit.then(async resultArray=>{
        results.push(resultArray[0]);
        console.log("pushed");
        resolve({resultArray:resultArray[0],tabId:tab.id});
        }).catch(e=>{console.error(e)});
      }).catch(e=>{console.error(e);browser.tabs.remove(tab.id);})
    })
    // wait for query response, push results into resultsArray and close query window
    let queryResponse = await promise;
    queryPromises.push(queryResponse.resultArray)
    browser.tabs.remove(queryResponse.tabId);
  }
  //submits data if all queries either returned results or closed with an error
  Promise.all(queryPromises)
  .then(results=>{
    submitData(results)
    browser.storage.local.set({lastSubmit:results[results.length-1]}).then((d)=>{console.log("last submit saved: ");console.log(results[results.length-1]);;});
    // console.log("This is received from page-crawl.js");
    // console.log(results);
  });
}

// initiates a first query, then starts an interval at the next valid schedule time that fires runQuery according to schedule
async function startStudyScheduler(keywords){
  if (schedulerRunning) {
    return true;
  }
  if (await checkSettings()) {
    console.log("ready for study");
  }else{
    console.log("User not ready to run query");
    return false;
  }
  //uncomment to enable rotating keyword selection
  //let keywords = rotateKeywords(allKeywords);
  runQuery(keywords);
  console.log("First query fired:");
  schedulerRunning = true;
  let now = new Date();
  let nextRun = getNextInterval(now, localStorageData.settings.schedule);
  let timeTillTask = nextRun - now;
  console.log("timeTillTask: "+ timeTillTask.toString());
  setTimeout(function(){
    firstRunId = runQuery(keywords);
    intervalId = createInterval(keywords,4*60*60*1000)
  },timeTillTask);
  console.log("Scheduler started with schedule: "+localStorageData.settings.schedule.toString());
}
//send study data to server
function submitData(data){
  let url = localStorageData.settings.serverAddr + '/SEW_Edinburgh_2019/newEntry';
  let xhttp = new XMLHttpRequest();
  xhttp.open("POST", url);
  xhttp.open("POST", url);
  xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded")
  let json = JSON.stringify(data);
  xhttp.send(json);
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      console.log(this);
      console.log(this.responseText);
      console.log("this is sent:");
      console.log(data);
      console.log("Size of the payload: " + json.length);

    }
  }
}

//sends a get request to the server and compares version numbers.
//updates stored config data if necessary
async function validateVersion(){
  let update = updateLocalStorageData();
  await update;
  let url = localStorageData.settings.serverAddr + '/SEW_Edinburgh_2019/update';
  let xhttp = new XMLHttpRequest();
  let response;
  xhttp.reponseType = "json";
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      let promise = new Promise((resolve,reject)=>{
      try {
        console.log(this)
        response = JSON.parse(this.responseText);
        console.log(response);
      } catch (e) {
          console.error("Update failed due to false server response: "+e);
          promise.reject("update failed")
      }
        if (localStorageData.settings.version < response.version) {
          browser.storage.local.set({settings:Object.assign(localStorageData.settings,{
              //schedule:response.settings.schedule,
              searchProvider : response.search_provider,
              serverAddr : response.serverAddr,
              version : response.version
            }
          )}).then(()=>console.log("config updated to version: "+ response.version));
          console.log("Config updated.");
          console.log("old config: " + JSON.stringify(localStorageData.settings));
          console.log("update: " + JSON.stringify(response));
          resolve("updated")
        }else {
          console.log("Config up to date.");
          resolve("up to date");
        }

    })}
  };
  xhttp.open("GET", url);
  xhttp.setRequestHeader('Content-Type', 'application/json');
  xhttp.send(localStorageData.settings);
}

//handles browserAction clicks. fires startStudyScheduler if scheduler is not running, opens study_thanks.html if it has
async function handleBrowserAction () {
  console.log("browser action triggered");
  if (await checkSettings()) {
    if (!schedulerRunning) {
      if (typeof localStorageData != 'undefined' && typeof localStorageData.user != 'undefined') {
        startStudyScheduler(localStorageData.user.keywords);
      }
    }else {
        browser.tabs.create({url:'/src/study_thanks.html'})
    }
  }else{
    console.log("not ready to run");
    return

  }
};

//relays message from options page
async function handleMessage(message){
  if (message.action =="exit_options") {
    console.log("exit_options and signUpForStudy");
    if (await checkSettings()) {
      startStudyScheduler();
    }
    //window.close(request.action.id);
    //console.log("oprions page closed");
  }
}

//callback for install event
function handleInstall(details){
    browser.storage.local.set(config);
    displayWelcomePage();
    validateVersion();
    if (details.temporary) {
      console.log("Welcome! to Testing!");
    }else {
      console.log("Welcome to EuroStemCell DataDonation");
    }
}

function handleStartup(){
  console.log("Startup registered");
  startStudyScheduler();
}
//find next scheduled study time by comparing schedule from config data to current hour
function getNextInterval(time,schedule) {
  let t = new Date(time);
  var i = schedule.length;
  while (schedule[--i] > time.getHours());
if (typeof schedule[++i] == 'undefined') {
  return new Date(t.getFullYear(),t.getMonth(),t.getDate()).setHours(0)+24*60*60*1000;
}else {
  return new Date(t.getFullYear(),t.getMonth(),t.getDate(),schedule[i]);
}
}

//creates an interval according to schedule
function createInterval(keywords,interval){
  return setInterval(function(){runQuery(keywords);},interval);
}

//rotates through the list of keywords in a 30-items block per day
function rotateKeywords(){
  let nowDays = new Date().getTime()/(24*60*60*1000);
  let index = nowDays % 4;
  return localStorageData.study.keywords[index]
}

//show a welcome page at install
function displayWelcomePage(){
    browser.tabs.create({url:"/src/study_startup.html"})
    .then(()=>{console.log("Welcome Page displayed");})
}

//helper function to shuffle keywords array
function shuffleArray(array) {
  let shuffledArray = array.slice()
    for (var i = shuffledArray.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = shuffledArray[i];
        shuffledArray[i] = shuffledArray[j];
        shuffledArray[j] = temp;
    }
  return shuffledArray;
}

browser.runtime.onStartup.addListener(handleStartup);
browser.runtime.onInstalled.addListener(handleInstall);
browser.browserAction.onClicked.addListener(handleBrowserAction);
browser.runtime.onMessage.addListener(handleMessage);
browser.storage.onChanged.addListener(updateLocalStorageData);
