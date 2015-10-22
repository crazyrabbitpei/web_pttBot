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
var item=0;
var board = 'BoardGame';//change the board name you want to crawl
//var board = 'Gossiping';//change the board name you want to crawl
var dir = './ptt_data/'+board;//the directory that store data and some details,like current page, log
var count=0;
var time=500;//frequency
var tag;

run_bot();

function run_bot(){
//create folder or use existing
fs.exists(dir,function(exists){
		if(exists) {
				//console.log(dir+" is exists");
				fs.readFile('./ptt_data/'+board+'/index.txt',function read(err,data){
					 if(err){
					 		 throw err;
					 }
					 else{
					 	index = parseInt(data);
					 	//console.log("index:"+index);
					 }
				});
				fs.readFile('./ptt_data/'+board+'/item.txt',function read(err,data){
					 if(err){
					 		 throw err;
					 }
					 else{
					 	item = parseInt(data);
					 	//console.log("item:"+item);
					 }
				});
		}
		else{
				//console.log("no "+ dir);
				fs.mkdir(dir,function(){
						//console.log("create:"+dir);
				});
				//fs.writeFile('./ptt_data/'+board+'/log_web_article.txt', '');
				fs.writeFile('./ptt_data/'+board+'/index.txt','1');
	            index=1;
				fs.writeFile('./ptt_data/'+board+'/item.txt','0');
	            item=0;
        }
		});
    crawlIndex();
}

function crawlIndex(){
//get new page
//request.cookie('over18=1');
request({
		  uri: "https://www.ptt.cc/bbs/"+board+"/index.html",
          headers:{
            'Cookie': 'over18=1'
          }
},function(error, response, body){
    var status="";
	try{
	    var $ = cheerio.load(body);
        var nextpage=0;
	    var  get_page = $("div > div > div.action-bar > div.btn-group.pull-right > a:nth-child(2).btn.wide");
        page = parseInt(S(get_page.attr('href')).between('index','.html').s)+1;

    }
    catch(e){
        status="false";
        //console.log("error:"+error+" statusCode"+response.statusCode);
		fs.writeFile('./ptt_data/'+board+'/log_web_article.txt', "false---->\n"+body+'\nhttps://www.ptt.cc/bbs/'+board+'/index'+index+'.html');
    }
    finally{
        if(status=="false"){
            return;
        }
        else{
            if(item==20&&page!=index){
                item=0;
                nextpage=1;
            }
            //console.log("from index:"+index+" to page:"+page+" current_item:"+item);
            //fs.appendFile('./ptt_data/'+board+'/log_web_article.txt',"index:"+index+" page:"+page+"\n");
            if(page!=index){
                fs.writeFile('./ptt_data/'+board+'/index.txt',page);
            }
            var i = index;

            var tag = setInterval(function(){
                    if(i>page){
                        clearInterval(tag);
                    }
                    else{
                        //fs.appendFile('./ptt_data/'+board+'/log_web_article.txt','https://www.ptt.cc/bbs/'+board+'/index'+i+'.html'+"\n");
                        //console.log('https://www.ptt.cc/bbs/'+board+'/index'+i+'.html');
                        href = 'https://www.ptt.cc/bbs/'+board+'/index'+i+'.html';
                        lookp(i,href,item,nextpage);
                        item=0;
                        nextpage=0;
                        i++;
                    }
            },time);
        
        }
    }
});

}

function lookp(i,href,item,nextpage){
				request({
					 uri: href,
                     headers:{                                                                                                                                'Cookie': 'over18=1'
                     },
					 timeout:100000,
				}, function(error, response, body) {
							if(typeof response == "undefined"){
								 lookp(i,href,item);						
							}
							else if(response.statusCode!==200){
									//fs.appendFile('./ptt_data/'+board+'/log_web_article.txt', "--->["+i+"]page response:"+response.statusCode+'\n'+"uri:"+'https://www.ptt.cc/bbs/'+board+'/index'+i+'.html'+"\n");
								if(response.statusCode===503){
									lookp(i,href,item);
								}
							}
							else{
                                myBot.checklist(body,page,function(listnum){
                                    //console.log("listnum:"+listnum);
                                    if(item<listnum&&nextpage!=1){
	                                    fs.writeFile('./ptt_data/'+board+'/item.txt',listnum);
                                        myBot.start(body,board,page,now,item,function(result){
                                            //console.log(result);
                                        });
                                        console.log("page:"+i+"  from link :"+item+" to link :"+listnum);
                                    }
                                    else if(item==0||item==20){
                                        console.log("page:"+i+"  old link :20 -> next page:"+(i+1));
                                    }
                                    else{
                                        console.log("page:"+i+"  current link :"+item+" -> next link:"+listnum);
                                    }

                                });
								//fs.appendFile('./ptt_data/'+board+'/log_web_article.txt', "--->["+i+"]page response:"+response.statusCode+'\n'+"uri:"+'https://www.ptt.cc/bbs/'+board+'/index'+i+'.html'+"\n");
							}
					});
}

exports.run_bot=run_bot;
