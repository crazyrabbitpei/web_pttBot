//var parseHtml = require('./parseHtml');
var parseHtml = require('./notice');
var request = require('request');
var fs = require('fs');
var iconv = require('iconv-lite');
var cheerio = require("cheerio");
var S = require('string');
var he = require('he');
var sleep = require('sleep');

var web  = 'https://www.ptt.cc';
var page_link;
var article_link = new Array();
var article_text = new Array();
var tag;
var time=500;
var date;
var board = 'BoardGame';

function checklist(body,page,callback){
			var i=0;

			var value=1;
			endpage = parseInt(page);
			article_text = [];
            //get all list a and grab the web
            try{
			    var $ = cheerio.load(body);
                $("div > div > div > div.title").each(function(){
                    i++;
                    var link = $(this);
                    var text = link.text();
                    //fs.appendFile('./ptt_data/'+board+'/log_web_article.txt',text);
                    //console.log("text:"+text);
                    if(text.indexOf("板務暨違規公告區")==-1&&text.indexOf("桌遊資源|置底閒聊|違規檢舉|板務反應")==-1&&text.indexOf("預計要出的中文遊戲")==-1){
                    //if(text.indexOf("跪求行車紀錄器畫面")==-1&&text.indexOf("徵求 9/16 樹林中正路行車記錄器")==-1&&text.indexOf("[協尋]楊湖路往富岡 行車紀錄器畫面")==-1&&text.indexOf("Fw: [協尋] 緊急協尋朋友的舅舅留了遺書後離家")==-1&&text.indexOf("[公告] 八卦板板規(2015.06.16)")==-1){
                        //console.log("["+i+"]:"+text);

                        article_text.push(text);
                    }
                    else{
                        //console.log("text:"+text+" is bottom");
                    }

                });
            }
            catch(e){
                fs.writeFile('./ptt_data/'+board+'/log_web_article.txt', "[ckecklist]false---->\n"+body);
            }
            finally{
                callback(article_text.length);
            }
}

function start(body,board,page,now,citem,callback){

			var i;
            var status="";
			var value=1;
			date  = now;
			endpage = parseInt(page);
			article_link = [];
			article_text = [];
            var cnt=0;
			//get all list a and grab the web
            try{
			    var $ = cheerio.load(body);
				$("div > div > div > div.title").each(function(){
						var link = $(this);
						var text = link.text();
						var href = link.children().attr('href');
                        if(text.indexOf("板務暨違規公告區")==-1&&text.indexOf("桌遊資源|置底閒聊|違規檢舉|板務反應")==-1&&text.indexOf("預計要出的中文遊戲")==-1){
                        //if(text.indexOf("跪求行車紀錄器畫面")==-1&&text.indexOf("徵求 9/16 樹林中正路行車記錄器")==-1&&text.indexOf("[協尋]楊湖路往富岡 行車紀錄器畫面")==-1&&text.indexOf("Fw: [協尋] 緊急協尋朋友的舅舅留了遺書後離家")==-1&&text.indexOf("[公告] 八卦板板規(2015.06.16)")==-1){
						    article_link.push(href);
						    article_text.push(text);
                            //console.log("["+cnt+"]"+"title:"+text+" href:"+link.children().attr('href'));
				        }
                        cnt++;
                });
            }
            catch(e){
                status="false";
                fs.writeFile('./ptt_data/'+board+'/log_web_article.txt', "[start]false---->\n"+body);
            }
            finally{
                if(status!="false"){
				    
				    for(i=citem;i<article_link.length;i++){
					    fs.appendFile('./ptt_data/'+board+'/articlelist.txt',"["+i+"]"+article_text[i]+"\t"+article_link[i]+"\n");
					    //fs.appendFile('./ptt_data/articlelist.txt',article_text[i]+"\n");
                        //console.log("["+i+"]"+"link length:"+article_link.length+" link:"+article_link[i]);
				    }
                    
                    i=citem;
                    while(i<article_link.length){
                        //console.log("["+i+"]"+"title:"+article_text[i]+" link:"+article_link[i]);
                        href = article_link[i];
                        if(typeof href=="undefined"){
                            i++;
                            continue;
                        }
                        text = article_text[i];
                        value = look(href,text,"0",i,endpage,board);
                        i++;
                    }
                   callback("start ok");
                }
                else{
                   callback("start false"); 
                }
            }
}
exports.checklist=checklist;
exports.start = start;
function look(href,text,value,num,page,board){
						request({
							uri:web+href,
                            headers:{                                                                                                                                'Cookie': 'over18=1'
                            },
							timeout:100000,
						},function(error,response,body){
							if(typeof response == "undefined"){
								look(href,text,"503",num,page,board);
							}
							else if(response.statusCode!==200){
									if(response.statusCode===503){
										if(value=="503"){
											//fs.appendFile('./ptt_data/log_web_article.txt', "\trepetenotok["+num+"]bot response:"+response.statusCode+'\n'+"\ttext:"+text+"\n"+"\thref:"+web+href+"\n");
										}
										else{
											//fs.appendFile('./ptt_data/'+board+'/log_web_article.txt', "\trepeteb["+num+"]bot response:"+response.statusCode+'\n'+"\ttext:"+text+"\n"+"\thref:"+web+href+"\n");
										}
										look(href,text,"503",num,page,board);
									}
									else{
										//fs.appendFile('./ptt_data/log_web_article.txt', "\trepetenotok["+num+"]bot response:"+response.statusCode+'\n'+"\ttext:"+text+"\n"+"\thref:"+web+href+"\n");
									}
							}
							else{
									if(value=="503"){
										//fs.appendFile('./ptt_data/log_web_article.txt', "\trepeteok["+num+"]bot response:"+response.statusCode+'\n'+"\ttext:"+text+"\n"+"\thref:"+web+href+"\n");
									}
									else{
										//fs.appendFile('./ptt_data/log_web_article.txt', "\tonceok[o]["+num+"]bot response:"+response.statusCode+'\n'+"\ttext:"+text+"\n"+"\thref:"+web+href+"\n");
									}
									//fs.appendFile('./ptt_data/'+board+'/web_article.txt',"\t"+iconv.encode(body,'utf-8'),function (err){});
                                    iconv.encode(body,'utf-8');
									url = web+href;
									parseHtml.convert(text,body,board,page,date,url);
								return 200;
							}
						});
						return 503;

}
