import {config,setConfig} from "/src/config.js";

let testing = false;
let localStorageData;
let lastSubmit;
let optionsPage;

let intervalId, firstRunId;
let schedulerRunning = false;

updateLocalStorageData();

//updates globally accessible localStorageData whenever there is a storage change event
async function updateLocalStorageData(changes,area){
  let promise = browser.storage.local.get().then((data)=>{localStorageData = data})
  .then(()=>{
    if (typeof localStorageData.settings == 'undefined') {
      browser.storage.local.set({settings:config.settings,selectors:config.selectors});
    }
  })
  .catch((e)=>{console.error(e);})
  await promise;

  try {
    let changedItems = Object.keys(changes);
    let changedKeys = "";
    for (let key of changedItems) {
      changedKeys += key+" ";
    }
    // for (var item of changedItems) {
    //   console.log(item + " has changed:");
    //   console.log("Old value: ");
    //   console.log(changes[item].oldValue);
    //   console.log("New value: ");
    //   console.log(changes[item].newValue);
    // }
    console.log("Changed: "+changedKeys);
    console.log(changes);
  } catch (e) {
    console.log("unchanged: "+e);
  }
}

// checks if the survey was already answered and opens the options page if it has not.
// checks if the user is signed into a study and does so if this is not the case.
// returns user's study ID if the checks above return true
async function checkSettings(){
  let signCheck;
  await validateVersion();
  console.log("check data");
  if (testing) {
    console.log(localStorageData);
  }
  if (typeof localStorageData == 'undefined' || !localStorageData.hasOwnProperty("privacy") || !localStorageData.privacy) {
    console.log("User needs to accept privacy statement");
    displayPrivacyPage();
    return false;
  }
  if (!localStorageData.hasOwnProperty("user")|| typeof localStorageData.user.formFilled == "undefined"||!localStorageData.user.formFilled) {
      console.log("formFilled undefined or false: open options");
      optionsPage = browser.runtime.openOptionsPage();
      return false;
  }else if (typeof localStorageData.user.isSigned == "undefined" || !localStorageData.user.isSigned) {
      signCheck=signUpForStudy();
      if(await signCheck){
        console.log("User is now signed up for Study");
      }else{
        console.log("User could not be signed up for study");
        return false;}
      }else if (localStorageData.user.isSigned) {
          console.log("User already signed up and ready to run study");
        }
  browser.browserAction.setIcon({path:'/icons/esc_plugin_icon_48.png'});
  browser.browserAction.setTitle({title:'You are signed up and the plugin is donating data every 4 hours.\nClick to see your last donation.'});
  return true;
}

//signs a new user up for participation and receives the respective participant ID
function signUpForStudy(){
  let save;
  console.log("Sign up for study with: ");
  console.log(JSON.stringify(localStorageData.user));
  let url = localStorageData.settings.serverAddr + '/SEW_Edinburgh_2019/newParticipant';
  let xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = async function() {

    if (this.readyState == 4 && this.status == 200) {
      console.log(this);
      try {
        let response = JSON.parse(this.responseText);
        save = browser.storage.local.set({
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
      await save;
      console.log("Signed up");
      startStudyScheduler();
      return true;
    }
  };
  xhttp.onerror = ((e)=>{console.log("Sign up failed");console.error(e);console.log(response);return false});
  xhttp.open("POST", url);
  xhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  xhttp.send(JSON.stringify(localStorageData.user));
}

//opens window in which the crawl script is being executed with the passed keywords
async function runQuery(keywords){
  if (typeof keywords == 'undefined') {
    console.log("Query unsuccessful: keywords undefined");
    return false;
  }
//toggle info popup during query
  // browser.storage.local.get("hide_popup").then(b=>{
  //   if (typeof b.hide_popup != "undefined" && b.hide_popup) {
  //     console.log("popup hidden");
  //     browser.browserAction.setPopup(
  //       {popup:null}
  //     )
  //   }else {
  //     console.log("popup shows");
  //     browser.browserAction.setPopup(
  //       {popup:"./popup.html"}
  //     )
  //   }
  // })

  let results = []
  let index = 0;
  let queryPromises = [];
  let shuffledKeywords;
  shuffledKeywords = shuffleArray(keywords);
  console.log("runQuery with: "+shuffledKeywords);
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
async function startStudyScheduler(){
  if (await checkSettings()) {
    console.log("Scheduler: ready for study");
  }else{
    console.log("Scheduler: User not ready to run query");
    return false;
  }
  let alarmName = "studyScheduler"
  let keywords = localStorageData.user.keywords
  if (typeof await browser.alarms.get(alarmName) != 'undefined') {
    console.log("Scheduler already running");
    return true;
  }

  console.log("Initial query");
  runQuery(keywords);

  let now = new Date();
  let nextRun = getNextInterval(now, localStorageData.settings.schedule);
  browser.alarms.create(alarmName,{
    when:nextRun,
    periodInMinutes:60*4
  })
  schedulerRunning = true;
  console.log("Alarm created: "+alarmName);
  // let timeTillTask = nextRun - now;
  // console.log("timeTillTask: "+ timeTillTask.toString());
  // setTimeout(function(){
  //   firstRunId = runQuery(keywords);
  //   intervalId = createInterval(keywords,4*60*60*1000)
  // },timeTillTask);
  // console.log("Scheduler started with schedule: "+localStorageData.settings.schedule.toString());
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
  console.log("Validate");
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
        response = JSON.parse(this.responseText);
      } catch (e) {
          console.error("Update failed due to false server response: "+e);
          console.error("Server response:");
          console.log(response);
          promise.reject("update failed")
      }
        if (localStorageData.settings.version < response.version) {
          browser.storage.local.set({settings:Object.assign(localStorageData.settings,{
              //schedule:response.settings.schedule,
              searchProvider : response.search_provider,
              serverAddr : response.serverAddr,
              version : response.version
            }
          )}).then(()=>console.log("Config updated to version: "+ response.version));
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
  console.log(await browser.alarms.getAll());
  if (await checkSettings()) {
    if (!schedulerRunning) {
      console.log("start scheduler");
        startStudyScheduler();

    }else {
      console.log("show thanks");
        browser.tabs.create({url:'/src/study_thanks.html'})
    }
  }else{
    console.log("not ready to run");
    return

  }
}

//relays message from options page
async function handleMessage(request, sender, sendResponse){
  if (!request.hasOwnProperty('action')) {
    return;
  }
  switch (request.action){
    case "exit_options":
    console.log("exit_options and signUpForStudy");
    if (await checkSettings()) {
      startStudyScheduler();
    }
    //window.close(request.action.id);
    //console.log("oprions page closed");
    break;
    case "testing?":
      return {testing:testing};
    break;
    }
}

//handles alarms, particularly from the studyScheduler
function handleAlarm(alarmInfo) {
  if (alarmInfo.name == "studyScheduler") {
    console.log("Alarm "+alarmInfo.name+" triggered. Next at "+alarmInfo.scheduledTime);
    runQuery(localStorageData.user.keywords)
  }
}

//callback for install event
async function handleInstall(details){
    await updateLocalStorageData();
    displayPrivacyPage();
    validateVersion();
    if (details.temporary) {
      console.log("Welcome! to Testing!");
      testing = true;
    }else {
      console.log("Welcome to EuroStemCell DataDonation");
    }
}

function handleStartup(){
  console.log("Startup registered");
  setTimeout(startStudyScheduler,1000*30);
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
function displayPrivacyPage(){
    browser.tabs.create({url:"/src/study_privacy.html"})
    .then(()=>{console.log("Privacy Page displayed");})
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

//helper function to detect testing/temporary install
function getMode(){
  return testing;
}

browser.runtime.onStartup.addListener(handleStartup);
browser.runtime.onInstalled.addListener(handleInstall);
browser.browserAction.onClicked.addListener(handleBrowserAction);
browser.runtime.onMessage.addListener(handleMessage);
browser.storage.onChanged.addListener(updateLocalStorageData);
browser.alarms.onAlarm.addListener(handleAlarm);
