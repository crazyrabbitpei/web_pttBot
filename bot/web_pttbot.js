var parseHtml = require('./parseHtml');//for big grab
//var parseHtml = require('./notice');//for watching
var request = require('request');
var fs = require('fs');
var iconv = require('iconv-lite');
var cheerio = require("cheerio");
var S = require('string');
var he = require('he');
var sleep = require('sleep');

function checklist(body,page,callback){
    var i=0;


    var value=1;
    endpage = parseInt(page);
    //get all list a and grab the web
    try{
        var $ = cheerio.load(body);
        $("div > div > div > div.title").each(function(){
            i++;
            var link = $(this);
            var text = link.text();
            text = S(text).between('<body>','<div class="r-list-sep"></div>');
            text = he.decode(text);
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

function start(current_page,body,board,page,owner,timeper,callback){

    var i;
    var status="";
    var value=1;
    var article_link = new Array();
    var article_text = new Array();
    endpage = parseInt(page);
    var cnt=0;
    //get all list a and grab the web
    try{
        if((bodytemp = S(body).between('<html>','<div class="r-list-sep"></div>'))){
            if(bodytemp!=""){
                body = he.decode(bodytemp);
                body = body+"</body></html>";
                //console.log("=>"+bodytemp);
            }
        }
        var $ = cheerio.load(body);
        $("div > div > div > div.title").each(function(){
            var link = $(this);
            var text = link.text();
            var href = link.children().attr('href');
            //if(text.indexOf("板務暨違規公告區")==-1&&text.indexOf("桌遊資源|置底閒聊|違規檢舉|板務反應")==-1&&text.indexOf("預計要出的中文遊戲")==-1){
                
                article_link.push(href);
                article_text.push(text);
                //console.log("["+cnt+"]"+"title:"+text+" href:"+link.children().attr('href'));
            //}
            cnt++;
        });
    }
    catch(e){
        status="false";
        fs.writeFile('./ptt_data/'+owner+'/'+board+'/log_web_article.txt', "[start]false---->\n"+body);
    }
    finally{
        if(status!="false"){
            /*
            for(i=0;i<article_link.length;i++){
                fs.appendFile('./ptt_data/'+owner+'/'+board+'/articlelist.txt',"["+i+"]"+article_text[i]+"\t"+article_link[i]+"\n");
            }
            */
            var linc=0;
            var terid = setInterval(function(){
                text = article_text[linc];
                href = article_link[linc];
                if(typeof article_link[linc]=="undefined"){
                    console.log("undefined");
                    console.log("linc:"+linc+" article_link.length:"+article_link.length)
                    linc++;
                    if(linc>=article_link.length){
                        clearInterval(terid);
                    }
                }
                else{
                    fs.appendFile('./ptt_data/'+owner+'/'+board+'/articlelist.txt',"["+current_page+"] "+linc+" grap[:"+board+"] href:"+href+"\n");
                    look(href,text,"0",board,owner,linc);
                    linc++;
                    if(linc>=article_link.length){
                        clearInterval(terid);
                    }
                }
            },timeper);
            callback(article_link.length);
        }
        else{
            callback(0); 
        }
    }
}
exports.checklist=checklist;
exports.start = start;


function look(href,text,value,board,owner,linc){
    var web="https://www.ptt.cc";
    var url = web+href;
    var date;
    var againTime = 10000+(linc*1000);
    request({
        uri:url,
        headers:{                                                                                                                                'Cookie': 'over18=1'
        },
        timeout:100000,
    },function(error,response,body){
        if(typeof response == "undefined"){
            setTimeout(
                function(){
                    date = new Date();
                    //fs.appendFile('./ptt_data/'+owner+'/'+board+'/tryagain_link',"t:["+date+"]"+href+"\n");
                    look(href,text,"503",board,owner,linc);
                },
                againTime
            )

        }
        else if(response.statusCode!==200){
            if(response.statusCode===503){
                if(value=="503"){
                    //fs.appendFile('./ptt_data/log_web_article.txt', "\trepetenotok["+num+"]bot response:"+response.statusCode+'\n'+"\ttext:"+text+"\n"+"\thref:"+web+href+"\n");
                }
                else{
                    //fs.appendFile('./ptt_data/'+board+'/log_web_article.txt', "\trepeteb["+num+"]bot response:"+response.statusCode+'\n'+"\ttext:"+text+"\n"+"\thref:"+web+href+"\n");
                }
                setTimeout(
                    function(){
                        date = new Date();
                        //fs.appendFile('./ptt_data/'+owner+'/'+board+'/tryagain_link',"t:["+date+"]"+href+"\n");
                        look(href,text,"503",board,owner,linc);
                    },
                    againTime
                )
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
            date = new Date();
            //fs.appendFile('./ptt_data/'+owner+'/'+board+'/tryagain_link',"=>okt:["+date+"]"+href+"\n");
            iconv.encode(body,'utf-8');
            parseHtml.convert(text,body,board,url,owner);
            return 200;
        }
    });
    return 503;

}
