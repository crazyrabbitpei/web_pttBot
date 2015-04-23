var parseHtml = require('./parseHtml');
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
function start(body,board,page,now){

			var i;
			var $ = cheerio.load(body);
			var value=1;
			date  = now;
			endpage = parseInt(page);
			article_link = [];
			article_text = [];
			//get all list a and grab the web
				$("div > div > div > div.title > a").each(function(){
						var link = $(this);
						var text = link.text();
						var href = link.attr("href");
						article_link.push(href);
						article_text.push(text);
				});
				
				/*for(i=0;i<article_link.length;i++){
					//fs.appendFile('./ptt_data/articlelist.txt',"["+i+"]"+article_text[i]+"\t"+article_link[i]+"\n");
					fs.appendFile('./ptt_data/articlelist.txt',article_text[i]+"\n");
				}*/
						i=0;
						while(i<article_link.length){	
							href = article_link[i];
							text = article_text[i];
							value = look(href,text,"0",i,endpage,board);
							i++;
						}
				return value;
}
exports.start = start;

function look(href,text,value,num,page,board){
						request({
							uri:web+href,
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
									//fs.appendFile('./ptt_data/web_article.txt',"\t"+iconv.encode(body,'utf-8'),function (err){});
									url = web+href;
									parseHtml.convert(body,board,page,date,url);
								return 200;
							}
						});
						return 503;

}
