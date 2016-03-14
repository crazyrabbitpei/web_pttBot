var parseHtml = require('./parseHtml');//for big grab
//var parseHtml = require('./notice');//for watching
var request = require('request');
var fs = require('graceful-fs');
var iconv = require('iconv-lite');
var cheerio = require("cheerio");
var S = require('string');
var he = require('he');
var sleep = require('sleep');

var stop_flag1=0;


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

function start(s_links,r_links,lastdate,current_page,citem,body,board,page,owner,timeper,callback){

    var i;
    var status="";
    var value=1;
    var article_link = new Array();
    var article_text = new Array();
    endpage = parseInt(page);
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
            /*
            for(i=0;i<article_link.length;i++){
                fs.appendFile('./ptt_data/'+owner+'/'+board+'/articlelist.txt',"["+i+"]"+article_text[i]+"\t"+article_link[i]+"\n");
            }
            */
            //var linc=citem;
            var linc=article_link.length-1;
            
            var temp_cnt=0;
            /*
            if(citem==19){
                temp_cnt=0;
            }
            */
            var lastpost="";

            var terid = setInterval(function(){
                if(stop_flag1==0){
                    text = article_text[linc];
                    href = article_link[linc];
                    //console.log("page:"+current_page+" linc:"+linc+" article_link:"+article_link[linc]+" temp_cnt:"+temp_cnt);
                    if(linc==-1){
                        //console.log("["+board+"]["+current_page+"] s_links:"+s_links+" r_links:"+r_links);
                        if(s_links==r_links){
                            clearInterval(terid);
                            callback(0,1);
                            return;
                        }
                            
                    }
                    else if(typeof article_link[linc]=="undefined"){
                        //console.log("linc:"+linc+" article_link.length:"+article_link.length);

                        //console.log("article_link["+linc+"]=\"undefined\"");
                        //linc--;
                        temp_cnt++;
                        if(temp_cnt>=article_link.length){
                            clearInterval(terid);
                        }
                    }
                    else{
                        if(lastpost==""){
                            lastpost = linc;
                        }
                        //console.log("["+board+"]["+current_page+"] s_links:"+s_links+" r_links:"+r_links);
                        s_links++;
                        look(lastpost,0,lastdate,href,text,"0",board,owner,linc,article_link.length,current_page,endpage,function(reach,temp_owner,temp_board,temp_current_page,temp_linc,temp_linc_length,temp_href){
                            r_links++;
                            if(reach==1){
                                stop_flag1=reach;
                                //clearInterval(terid);
                                //callback(temp_linc_length,reach);
                                //return;
                            }
                            else{
                                fs.appendFile('./ptt_data/'+temp_owner+'/'+temp_board+'/articlelist.txt',"["+temp_current_page+"] "+temp_linc+" grap[:"+temp_board+"] href:"+temp_href+"\n");
                            }
                        });
                        //linc--;
                        temp_cnt++;
                        /*
                           if(linc>=article_link.length){
                           clearInterval(terid);
                           }
                           */
                    }
                    linc--;

                }
                else if(stop_flag1==1&&s_links==r_links){
                    //console.log("stop_flag1:"+stop_flag1);
                    callback(0,stop_flag1);
                    clearInterval(terid);
                    return;
                }

            },timeper);
            //callback(article_link.length,0);
        }
        else{
            start(lastdate,current_page,citem,body,board,page,owner,timeper,callback);
            //callback(0,-1); 
        }
    }
}
exports.checklist=checklist;
exports.start = start;


function look(lastpost,check,lastdate,href,text,value,board,owner,linc,linc_length,current_page,end_page,fin){
    var web="https://www.ptt.cc";
    var url = web+href;
    var date;
    var againTime = 2000;
    if(linc==lastpost){
        againTime = 1;
    }
    request({
        uri:url,
        headers:{                                                                                                                                'Cookie': 'over18=1'
        },
        timeout:100000,
    },function(error,response,body){
        if(typeof response == "undefined"){
		if(check<30){
			setTimeout(
				function(){
				date = new Date();
				//fs.appendFile('./ptt_data/'+owner+'/'+board+'/tryagain_link',"t:["+date+"]"+href+"\n");
				look(lastpost,check+1,lastdate,href,text,"503",board,owner,linc,linc_length,current_page,end_page,fin);
				},
				againTime
			)
		}
        }
        else if(response.statusCode!==200){
            if(response.statusCode===503){
                if(value=="503"){
                    //fs.appendFile('./ptt_data/log_web_article.txt', "\trepetenotok["+num+"]bot response:"+response.statusCode+'\n'+"\ttext:"+text+"\n"+"\thref:"+web+href+"\n");
                }
                else{
                    //fs.appendFile('./ptt_data/'+board+'/log_web_article.txt', "\trepeteb["+num+"]bot response:"+response.statusCode+'\n'+"\ttext:"+text+"\n"+"\thref:"+web+href+"\n");
                }
		if(check<30){
                setTimeout(
                    function(){
                        date = new Date();
                        //fs.appendFile('./ptt_data/'+owner+'/'+board+'/tryagain_link',"t:["+date+"]"+href+"\n");
                        look(lastpost,check+1,lastdate,href,text,"503",board,owner,linc,linc_length,current_page,end_page,fin);
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
    });
}
