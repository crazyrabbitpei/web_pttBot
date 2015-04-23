var myBot = require('./bot/web_pttbot.js');
var request = require('request');
var http = require('http');
var fs = require('fs');
var iconv = require('iconv-lite');
var cheerio = require("cheerio");
var S = require('string');
var he = require('he');
var dateFormat = require('dateformat');
var now = new Date();

var page=1;
var index=780;
var board = 'Chiayi';//change the board name you want to crawl
var dir = './ptt_data/'+board;//the directory that store data and some details,like current page, log
var count=0;
var time=500;//frequency
var tag;

//create folder or use existing
fs.exists(dir,function(exists){
		if(exists) {
				console.log(dir+" is exists");
				fs.readFile('./ptt_data/'+board+'/index.txt',function read(err,data){
					 if(err){
					 		 throw err;
					 }
					 else{
					 	index = parseInt(data);
					 	//index =1;
					 	console.log("index:"+index);
					 }
				});
		}
		else{
				console.log("no "+ dir);
				fs.mkdir(dir,function(){
						console.log("create:"+dir);
				});
				fs.writeFile('./ptt_data/'+board+'/log_web_article.txt', '');
				fs.writeFile('./ptt_data/'+board+'/index.txt','1');
		}
		});

//get new page
request({
		  uri: "https://www.ptt.cc/bbs/"+board+"/index.html",
},function(error, response, body){
	var $ = cheerio.load(body);
	var  get_page = $("div > div > div.action-bar > div.btn-group.pull-right > a:nth-child(2).btn.wide");
	page = parseInt(S(get_page.attr('href')).between('index','.html').s)+1;
	console.log("index:"+index+" page:"+page);
	fs.appendFile('./ptt_data/'+board+'/log_web_article.txt',"index:"+index+" page:"+page+"\n");
	fs.writeFile('./ptt_data/'+board+'/index.txt',page);
	var i = index;
	var tag = setInterval(function(){
		if(i>page){
			clearInterval(tag);
		}
		else{
			console.log('https://www.ptt.cc/bbs/'+board+'/index'+i+'.html');
			href = 'https://www.ptt.cc/bbs/'+board+'/index'+i+'.html';
			lookp(i,href);
			i++;
		}
	},time);
});

function lookp(i,href){
				request({
					 uri: href,
					 timeout:100000,
				}, function(error, response, body) {
							if(typeof response == "undefined"){
								 lookp(i,href);						
							}
							else if(response.statusCode!==200){
									fs.appendFile('./ptt_data/'+board+'/log_web_article.txt', "--->["+i+"]page response:"+response.statusCode+'\n'+"uri:"+'https://www.ptt.cc/bbs/'+board+'/index'+i+'.html'+"\n");
								if(response.statusCode===503){
									lookp(i,href);
								}
							}
							else{
								var value = myBot.start(body,board,page,now);
								fs.appendFile('./ptt_data/'+board+'/log_web_article.txt', "--->["+i+"]page response:"+response.statusCode+'\n'+"uri:"+'https://www.ptt.cc/bbs/'+board+'/index'+i+'.html'+"\n");
							}
					});
}


