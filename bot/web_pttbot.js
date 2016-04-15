var parseHtml = require('./parseHtml');//for big grab
//var parseHtml = require('./notice');//for watching
var request = require('request');
var fs = require('graceful-fs');
var iconv = require('iconv-lite');
var cheerio = require("cheerio");
var S = require('string');
var he = require('he');
var sleep = require('sleep');

var HashMap = require('hashmap');

var maxRetry = 50;
var stop_flag1=0;
var stop_page=0;
var ok_page=0;

function checklist(body,page,callback){

    var i=0;
    var value=1;
    var article_text = new Array();
    endpage = parseInt(page);
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
            article_text.push(text);

        });
    }
    catch(e){
        fs.writeFile('./ptt_data/'+board+'/log_web_article.txt', "[ckecklist]false---->\n"+body);
    }
    finally{
        callback(article_text.length);
    }
}

function start(lastindex,s_pages,s_links,r_links,lastdate,current_page,citem,body,board,page,owner,timeper,callback){
    var page_link = new HashMap();
    /*
    if(s_pages==1){
        stop_page=0;
    }
    */
   /*
    endpage = parseInt(page);
    if(stop_page==2){
        console.log("--reach stop page!--");
        callback(1,1);
        stop_page=0;
    }
    */
    var i=0;
    var status="";
    var value=1;
    var article_link = new Array();
    var article_text = new Array();

    stop_flag1=0;
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

            var href = link.children().attr('href');
            
            var text = link.text();
            article_link.push(href);
            article_text.push(text);
            cnt++;
        });
    }
    catch(e){
        status="false";
        fs.writeFile('./ptt_data/'+owner+'/'+board+'/log_web_article.txt', "[start]false---->\n"+body);
    }
    finally{
        if(status!="false"){
            
            for(i=0;i<article_link.length;i++){
                if(typeof article_link[i]==="undefined"){
                    page_link.set(i,"1");
                }
                else if(current_page==lastindex&&i<=citem&&lastdate!=0){
                    page_link.set(i,"1");
                }
                else{
                    page_link.set(i,"-1");
                }
            }
            
            //var linc=citem;
            var linc=article_link.length-1;
            var bottom=0;
            var temp_cnt=0;
            var delete_cnt=0;
            /*
            if(citem==19){
                temp_cnt=0;
            }
            */
            var lastpost="";
            
            var terid = setInterval(function(){
                //else{
                    text = article_text[linc];
                    href = article_link[linc];
                    if(linc<=0){
                            clearInterval(terid);
                    }
                    if(typeof article_link[linc]==="undefined"){
                        if((article_link.length-1)==linc&&current_page==page){
                            var time2 = new Date();                                                                                                    fs.writeFile('./ptt_data/'+owner+'/'+board+'/lastdate.txt',time2);
                        }
                        fs.appendFile("./ptt_data/"+owner+"/"+board+"/404.link","page:"+current_page+" linc:"+linc+"\n--\n",function(){
                        });
                        //console.log("article_link["+linc+"]=undefined");
                        delete_cnt++;
                    }
                    else{
                        if(lastpost==""){
                            lastpost = linc;
                        }

                        s_links++;
                        look(0,lastpost,0,lastdate,href,text,"0",board,owner,linc,article_link.length,current_page,endpage,function(reach,temp_owner,temp_board,temp_current_page,temp_linc,temp_linc_length,temp_href){
                            page_link.set(temp_linc,"1");
                            var links_ncrawled=0;
                            var j;
                            for(j=0;j<page_link.values().length;j++){
                                if(page_link.values()[j]=="-1"){
                                    links_ncrawled++;
                                }
                            }
                            r_links++;
                            //console.log("["+board+"]["+current_page+"] links not crawled:"+links_ncrawled);    
                            
                            if(lastdate!=0){
                                if(reach=="STOP_PAGE"){
                                    callback("STOP",temp_current_page);
                                    clearInterval(terid);
                                }
                                else if(reach=="STOP_LINK"){
                                    callback("STOP",temp_current_page);
                                    clearInterval(terid);
                                }
                            }

                            if(lastdate==0){
                                fs.appendFile('./ptt_data/'+temp_owner+'/'+temp_board+'/articlelist.txt',"["+temp_current_page+"] "+temp_linc+" grap[:"+temp_board+"] href:"+temp_href+"\n");
                            }
                            else if(lastdate!=0&&reach!="END"&&reach!="STOP_PAGE"&&reach!="STOP_LINK"){
                                fs.appendFile('./ptt_data/'+temp_owner+'/'+temp_board+'/articlelist.txt',"["+temp_current_page+"] "+temp_linc+" grap[:"+temp_board+"] href:"+temp_href+"\n");
                            }
                            if(reach=="END"||reach=="STOP_PAGE"||reach=="STOP_LINK"){
                                if(lastdate==0){
                                    if(links_ncrawled<=5){
                                        console.log("1.--DONE["+board+"]["+temp_current_page+"] s_links:"+s_links+" r_links:"+r_links);
                                        ok_page++;
                                        //console.log("["+temp_current_page+"]ok page num:"+ok_page);
                                        callback(reach,temp_current_page);
                                        //clearInterval(terid);
                                        //return;

                                    }
                                }
                                else{
                                //if(links_ncrawled<=5){
                                    console.log("2.--DONE["+board+"]["+temp_current_page+"] s_links:"+s_links+" r_links:"+r_links);
                                    ok_page++;
                                    //console.log("["+temp_current_page+"]ok page num:"+ok_page);
                                    callback(reach,temp_current_page);
                                    //clearInterval(terid);
                                    //return;

                                }

                            }
                            else if(reach!=0){
                                console.log("reach:"+reach);
                                //fs.appendFile("./stop.record","["+board+"]["+temp_current_page+"] reach:"+reach+"\n",function(){});
                                callback("TEST");
                            }
                        });
                        temp_cnt++;
                    }

                    linc--;

                //}

            },500);
        }
        else{
            start(s_links,r_links,lastdate,current_page,citem,body,board,page,owner,timeper,callback);
        }
    }
}
exports.checklist=checklist;
exports.start = start;


function look(retryc,lastpost,check,lastdate,href,text,value,board,owner,linc,linc_length,current_page,end_page,fin){
    var web="https://www.ptt.cc";
    var url = web+href;
    var date;
    var againTime = 20000;
    request({
        uri:url,
        headers:{                                                                                                                                'Cookie': 'over18=1'
        },
        timeout:12000,
        pool:{
            maxSockets:Infinity
        }
    },function(error,response,body){
        if(error){
            //console.log("2.["+board+"]["+current_page+"]["+linc+"]error:"+error.code+" connection timeout:"+error.connect);
            retryc++;
            if(retryc>maxRetry){
                fs.appendFile("./logs/retry.false","["+board+"]["+current_page+"]["+linc+"] href:"+url,function(){});
                fin(0,owner,board,current_page,linc,linc_length,url);
                return;
            }
            else{
                setTimeout(
                    function(){
                        date = new Date();
                        //fs.appendFile('./ptt_data/'+owner+'/'+board+'/tryagain_link',"t:["+date+"]"+href+"\n");
                        look(retryc,lastpost,check+1,lastdate,href,text,"503",board,owner,linc,linc_length,current_page,end_page,fin);
                    },
                    againTime
                )
            }

        }
        else{
            if(typeof response === "undefined"){
                //console.log("2.["+board+"]["+current_page+"]["+linc+"]error:response undefined");
                retryc++;
                if(retryc>maxRetry){
                    fs.appendFile("./logs/retry.false","["+board+"]["+current_page+"]["+linc+"] href:"+url,function(){});
                    fin(0,owner,board,current_page,linc,linc_length,url);
                    return;
                }
                else{
                    setTimeout(
                        function(){

                            date = new Date();
                            //fs.appendFile('./ptt_data/'+owner+'/'+board+'/tryagain_link',"t:["+date+"]"+href+"\n");
                            look(retryc,lastpost,check+1,lastdate,href,text,"503",board,owner,linc,linc_length,current_page,end_page,fin);
                        },
                        againTime
                    )
                }
            }
            else if(response.statusCode!==200){
                //console.log("error:response.statusCode:"+response.statusCode);
                if(response.statusCode===404){
                    fin(0,owner,board,current_page,linc,linc_length,url);
                    return;
                }
                else if(response.statusCode===503){
                    retryc++;
                    if(value=="503"){
                        //fs.appendFile('./ptt_data/log_web_article.txt', "\trepetenotok["+num+"]bot response:"+response.statusCode+'\n'+"\ttext:"+text+"\n"+"\thref:"+web+href+"\n");
                    }
                    else{
                        //fs.appendFile('./ptt_data/'+board+'/log_web_article.txt', "\trepeteb["+num+"]bot response:"+response.statusCode+'\n'+"\ttext:"+text+"\n"+"\thref:"+web+href+"\n");
                    }
                    if(retryc>maxRetry){
                        fs.appendFile("./logs/retry.false","["+board+"]["+current_page+"]["+linc+"] href:"+url,function(){});
                        fin(0,owner,board,current_page,linc,linc_length,url);
                        return;
                    }
                    else{
                        setTimeout(
                            function(){
                                date = new Date();
                                //fs.appendFile('./ptt_data/'+owner+'/'+board+'/tryagain_link',"t:["+date+"]"+href+"\n");
                                look(retryc,lastpost,check+1,lastdate,href,text,"503",board,owner,linc,linc_length,current_page,end_page,fin);
                            },
                            againTime
                        )
                    }
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

                parseHtml.convert(lastpost,lastdate,text,body,board,url,owner,linc,linc_length,current_page,end_page,function(reach,temp_owner,temp_board,temp_current_page,temp_linc,temp_linc_length,temp_url){
                    fin(reach,temp_owner,temp_board,temp_current_page,temp_linc,temp_linc_length,temp_url);
                    return;
                });
            }

        }

    });
}
