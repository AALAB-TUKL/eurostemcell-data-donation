document.body.style.border = "green dashed 5px";

let studyData;
let error_flag = 0;
let lastSubmit;

function crawlGooglePage(){
  console.log("Start crawl");
//COLLECT DATETIME
  let today = new Date();
  let date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
  let time =  ((today.getHours()<10)?"0"+today.getHours():today.getHours()) + ":" + ((today.getMinutes()<10)?"0"+today.getMinutes():today.getMinutes()) + ":" + ((today.getSeconds()<10)?"0"+today.getSeconds():today.getSeconds());
  let dateTime = date + ' ' + time;
  let timezoneOffset = today.getTimezoneOffset();
  //console.log(dateTime);

//COLLECT BROWSER LANGUAGE
  let userLang = navigator.language || navigator.userLanguage;
  //console.log(userLang);

//COLLECT QUERY //https://www.google.co.uk/search?q=[keyword]
    let query;
    try {
      query = decodeURI(document.querySelector(selectors.query).getAttribute('data-async-context').split(':')[1]);
    } catch (e) {
        console.log("No Query info on this page: " + e);
        query = false;
        return false;
    }

    // COLLECT LOGIN STATUS
    let loggedIn;
    try {
      loggedIn = document.querySelector(selectors.loggedIn)?true:false;
    } catch (e) {
      console.log('Login not resolved: ' + e);
    }

//COLLECT ADS
    let ads;
    let ads_formatted
    try {
      ads = document.querySelectorAll(selectors.ads.all);
      if(ads !== null && ads !== undefined && ads.length !== 0){
        //console.log("Ads:");
        ads_formatted = {};
        Array.prototype.forEach.call(ads, function (ad, index) {
        ads_formatted[index] = {};
        ads_formatted[index].name = ad.querySelector(selectors.ads.name).innerHTML;
        ads_formatted[index].title = ad.querySelector(selectors.ads.title).innerHTML;
        ads_formatted[index].url = ad.querySelector(selectors.ads.url).getAttribute("href");
        ads_formatted[index].content = ad.querySelector(selectors.ads.content).innerText;
        //console.log(ads_formatted[index].name + ": " + ads_formatted[index].head + ": " + ads_formatted[index].content + " (" + ads_formatted[index].url + ")");
      })
      }else {
        ads_formatted = [];
        throw "NodeList with length 0";
      }
    }
    catch(error) {
      console.log("No Ads found on this page: " + error);
    }

//COLLECT STORIES
    let topStories;
    let topStories_formatted;
    try {
      //div.dbsr:= listed topstories, cv2VAd:= whole carousel of topstories, add [data-init-vis=true] to limit results to visible carousel
      topStories = document.querySelectorAll(selectors.topStories.all);
      if (topStories.length == 0) {
        topStories_formatted = [];
        throw "NodeList with length 0"
      }
      topStories_formatted = {};
      Array.prototype.forEach.call(topStories, function (story, index) {
        topStories_formatted[index] = {};
        topStories_formatted[index].title = story.querySelector(selectors.topStories.title).innerHTML.replace(/<br>/g,'');
        topStories_formatted[index].url = story.querySelector(selectors.topStories.url).getAttribute('href');
        topStories_formatted[index].author = story.querySelector(selectors.topStories.author).innerHTML;
        topStories_formatted[index].position = index+1;
        //published missing!!!!
        //console.log("Story " + topStories_formatted[index].position + " " +topStories_formatted[index].author + ": " + topStories_formatted[index].title + " ("+topStories_formatted[index].url+")");
    } );
    } catch (error) {
        console.log("No Top Stories on this page: " + error);
    }

//COLLECT SEARCH RESULTS
  let searchResults;
  let searchResults_formatted;
    try {
      searchResults = document.querySelectorAll(selectors.results.all);
      searchResults_formatted= {};
      if (searchResults.length == 0) {
        searchResults_formatted = [];
        throw "searchResults with length 0"
      }
      //console.log("Search results:");
      let penalty = 0; //to correct index of the following loop if an infobox appears in order to adjust search results
      Array.prototype.forEach.call(searchResults, function (result, index) {
      if (result.querySelector('div.s span.st')) {
        searchResults_formatted[index] = {};
        searchResults_formatted[index].url = result.querySelector(selectors.results.url).getAttribute('href');
        searchResults_formatted[index].title = result.querySelector(selectors.results.title).innerText;
        searchResults_formatted[index].content = result.querySelector(selectors.results.content).innerText;
        searchResults_formatted[index].position = index + 1 - penalty;
        //console.log(searchResults_formatted[index].position + ".: " + searchResults_formatted[index].title + "(" + searchResults_formatted[index].url + "): "+ searchResults_formatted[index].content);
      }else {
        penalty+=1;
      }
      })
    } catch (e) {
      console.log("No search results available: " + e);
    }

    let crawlData = {
      "user_id": user.user_id,
      "study_id": user.study_id,
      "version": settings.version,
      "login_status": loggedIn,
      "language": userLang,
      "keyword": query,
      "search_date": dateTime,
      "error_flag": error_flag,
      "results": searchResults_formatted,
      "ads": ads_formatted,
      "topstories":topStories_formatted,
      "timezoneOffset":timezoneOffset,
      // "domain": window.location.hostname
      }
    console.log(crawlData);
    return(crawlData);
}

crawlGooglePage();
