export let config = {
  "selectors": {
    "query" : 'div#search div#rso',
    "loggedIn" : 'div.gb_Lf a#gb_70',
    "topStories" : {
      "all" : 'div.dbsr, div.So9e7d',
      "title": '.jBgGLd',
      "url" : 'a',
      "author" : 'span.wqg8ad, div.YQPQv>cite',
      "published" : 'div.GJhQm>span.f',
    },
    "ads":{
      "all" : 'li.ads-ad',
      "name" : 'div.ads-visurl > cite',
      "title" : 'li.ads-ad h3',
      "url" : 'li.ads-ad a~a',
      "content" : '.ads-creative',
    },
    "results":{
      "all" : 'div.bkWMgd div.srg div.g .rc',
      "url" : 'div.r a',
      "title" : 'div.r a h3.LC20lb',
      "content" : 'div.s span.st',
    }
},"settings" : {
    "searchProvider" : 'https://www.google.co.uk',
    "serverAddr": 'https://aalab1.cs.uni-kl.de',
    "schedule" : [0,4,8,12,16,20],
    "version":12.0
},"user" : {
    "user_id":"",
    "study_id":"",
    "keywords":["stem cell therapy parkinson", "ms new treatment stem cell"],
    "formFilled":false,
    "isSigned":false
  },
}

export function getSettings(){
  return config.settings;
}
export function setConfig(update){
  config = update;
  return config
}
export function getSelectors(){
  return config.selectors;
}
export function getConfig(){
  return config;
}
