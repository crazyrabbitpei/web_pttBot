var myBot = require('./bot/web_pttbot.js');
var request = require('request');
var http = require('http');
var fs = require('graceful-fs');
var iconv = require('iconv-lite');
var cheerio = require("cheerio");
var S = require('string');
var he = require('he');
var dateFormat = require('dateformat');
var now = new Date();

var link_count=0;

var dir;
var interval;
var againTime;
var nextBoardt;
var startnum;

var stop_flag=0;
var firstp_flag=0;

function start(url,toDir,fin){
    var board_name = S(url).between('bbs/','/index').s;
    run_bot(toDir,board_name,function(name,bname,index,item,lastdate){
        if(name==0||bname==0){
            console.log("run_bot error");   
        }
        else{
            console.log("name:"+name+" bname:"+bname+" url:"+url);
            crawlIndex(name,bname,index,item,lastdate,function(stat){
                fin(stat);
            });
        }
    });
}
exports.start = start;

/*
process.on('message',(url) => {
    console.log('CHILD got message:', url);
    var board_name = S(url).between('bbs/','/index').s;
    run_bot(toDir,board_name,function(name,bname,index,item,lastdate){
        if(name==0||bname==0){
            console.log("run_bot error");   
        }
        else{
            console.log("name:"+name+" bname:"+bname+" url:"+url);
            crawlIndex(name,bname,index,item,lastdate,function(stat){
                process.send(stat);
                //process.exit(0);
            });
        }
    });
});
*/
function run_bot(owner,board,fin){
    //read service information
    try{
        service = JSON.parse(fs.readFileSync('./service/'+owner+'/service1'));
        if(board==""){
            console.log("board name?");
            process.exit();
            return;
        }
        dir = service['data_dir'];
        interval = service['intervalPer'];
        againTime = parseInt(service['againTime']);
        nextBoardt = parseInt(service['nextBoardt']);
        //single version
        createDir(owner,board,function(name,bname,index,item,lastdate){
            fin(name,bname,index,item,lastdate);
        });
        //create folder or use existing
    }
    catch(e){
        console.log("[error] run_bot:"+e);
        fin(0,0,0,0,0,0);
    }
}
function createDir(owner,board,fin){
    var index,item,lastdate;
    var status=0;
    try{
        fs.exists(dir+"/"+owner+"/"+board,function(exists){
            if(exists) {
                console.log(dir+"/"+owner+"/"+board+" is exists");
                //index = fs.readFileSync(dir+'/'+owner+'/'+board+'/index.txt','utf8');
                //console.log("index:"+index);

                fs.readFile(dir+'/'+owner+'/'+board+'/index.txt',function read(err,data){
                    if(err){
                        throw err;
                    }
                    else{
                        index = parseInt(data);
                        //console.log("index:"+index);
                        fs.readFile(dir+'/'+owner+'/'+board+'/item.txt',function read(err,data){
                            if(err){
                                throw err;
                            }
                            else{
                                item = parseInt(data);
                                fs.readFile(dir+'/'+owner+'/'+board+'/lastdate.txt',function read(err,data){
                                    if(err){
                                        throw err;
                                    }
                                    else{
                                        lastdate = data;
                                        //console.log("lastdate:"+lastdate);
                                        fin(owner,board,index,item,lastdate);
                                    }
                                });
                            }
                        });
                    }
                });

                //item = fs.readFileSync(dir+'/'+owner+'/'+board+'/item.txt','utf8');
                //console.log("item:"+item);

            }
            else{
                index=0;
                item=0;
                lastdate=0;
                console.log("no "+ dir+"/"+owner+"/"+board);
                fs.mkdir(dir,function(){
                    console.log("create:"+dir);
                    fs.mkdir(dir+"/"+owner,function(){
                        console.log("create:"+dir+"/"+owner);
                        fs.mkdir(dir+"/"+owner+"/"+board,function(){
                            console.log("create:"+dir+"/"+owner+"/"+board);
                            fs.writeFile(dir+'/'+owner+"/"+board+'/index.txt','0');
                            fs.writeFile(dir+'/'+owner+"/"+board+'/item.txt','0');
                            fs.writeFile(dir+'/'+owner+"/"+board+'/lastdate.txt','0');
                            fin(owner,board,index,item,lastdate);
                        });	
                    });	
                });
            }
        });
    }
    catch(e){
        console.log("[error] createDir:"+e);
        status=1;
        fin(0,0,0,0,0);

    }
}
function crawlIndex(name,board,index,item,lastdate,fin)
{
    stop_flag=0;
    firstp_flag=0;
    //get new page
    request({
        uri: "https://www.ptt.cc/bbs/"+board+"/index.html",
        headers:{
            'Cookie': 'over18=1'
        },
        timeout:100000
    },function(error, response, body){
        if(error){
            var date = dateFormat(new Date(), "yyyymmdd");
            fs.appendFile(`${__dirname}/logs/err_`+date+`.log`,"["+board+"]"+error+"\n",function(err){
                if(err){
                    fs.appendFile(`${__dirname}/logs/err_`+date+`.log`,err+"\n",function(){});
                }
            });
            if(error=="ETIMEDOUT"){
                console.log("ETIMEDOUT, again!");
                setTimeout(
                    function(){
                        console.log("ETIMEDOUT,start!");
                        crawlIndex(name,board,index,item,lastdate,fin);
                    },
                    10*1000
                );
            }
            else{
                //console.log("error:"+error);
                crawlIndex(name,board,index,item,lastdate,fin);
                /*
                setTimeout(
                    function(){
                        console.log("error,start!");
                        crawlIndex(name,board,index,item,lastdate,fin);
                    },
                    10*1000
                );
                */
            }
        }
        else{
            var status="";
            try{
                var $ = cheerio.load(body);
                var nextpage=0;
                var  get_page = $("div > div > div.action-bar > div.btn-group.pull-right > a:nth-child(2).btn.wide");
                var page="";

                if(S(get_page.attr('href')).s&&typeof S(get_page.attr('href')).s !=="undefined"){
                    console.log("href:"+S(get_page.attr('href')).s);
                    fs.writeFile('./ptt_data/'+name+'/'+board+'/href.txt', S(get_page.attr('href')).s);
                    page = parseInt(S(get_page.attr('href')).between('index','.html').s)+1;
                    fs.writeFile('./ptt_data/'+name+'/'+board+'/index.txt', page);
                }
                else if(S(get_page.attr('class')).s=="btn wide disabled"){
                    console.log("class:"+S(get_page.attr('class')).s);
                    page=1;
                }
            }
            catch(e){
                status="false";
                console.log(e);
            }
            finally{
                var date = dateFormat(new Date(), "yyyymmdd");
                if(status!="false"){
                    if(response.statusCode==404){
                        fs.appendFile(`${__dirname}/logs/not_found_`+date+`.log`,"https://www.ptt.cc/bbs/"+board+"/index.html",function(err){
                            if(err){
                                fs.writeFile(`${__dirname}/logs/err_`+date+`.log`,"404 write failed:"+err,function(){});

                            }

                        });
                        fin('404');
                        return;
                    }
                }
                else if(status=="false"){
                    if(typeof response !=="undefined"){
                        fs.appendFile('./ptt_data/'+name+'/'+board+'/error.log',"error:"+error+"\n"+body+"\n"+response.statusCode);
                        //fin(response.statusCode);
                    }
                    else{
                        fs.appendFile('./ptt_data/'+name+'/'+board+'/error.log',"error:"+error+"\n"+body+"\n");
                        fin('false');
                    }
                    return;
                }
                if(page==""){
                    console.log("["+board+"]Page not get, again!");
                    //console.log("["+board+"]Page not get, again!:"+body);
                    crawlIndex(name,board,index,item,lastdate,fin);
                }
                else{
                    console.log("lastdate:"+lastdate+" index:"+index+" item:"+item+" total page:"+page);
                    var i = page;
                    var tag = setInterval(function(){
                        //console.log("stop_flag:"+stop_flag+" firstp_flag:"+firstp_flag);
                        if(stop_flag==0){
                            /*
                            if(lastdate==0&&i<0&&i!=""){
                                    console.log("--[FIRST] to the end--");
                                    //fs.writeFile('./service/'+name+'/links_count', link_count);
                                    //clearInterval(tag);
                                    //fin(board);
                                    //return;
                            }
                            */
                            //else{
                                var url = "https://www.ptt.cc/bbs/"+board+"/index"+i+".html";
                                if(index!=i){
                                    lookp(lastdate,i,url,page,19,board,name,interval,function(reach){
                                        if(reach==1){
                                            stop_flag=1;
                                            console.log("--reach date--");
                                            //fs.writeFile('./service/'+name+'/links_count', link_count);
                                            //clearInterval(tag);
                                            //fin(board);
                                            //return;
                                        }
                                    });
                                }
                                else if(index==page){
                                    lookp(lastdate,i,url,page,item,board,name,interval,function(reach){
                                        if(reach==1){
                                            stop_flag=1;
                                            console.log("--reach date--");
                                            //fs.writeFile('./service/'+name+'/links_count', link_count);
                                            //clearInterval(tag);
                                            //fin(board);
                                            //return;
                                        }
                                    });
                                }
                                i--;
                            //}
                        }
                        else if(stop_flag==1&&firstp_flag==1){
                            //console.log("["+board+"]back");
                            clearInterval(tag);
                            fin(board);
                            return;
                        }
                    },interval);
                }

            }
        }

    });
}

function lookp(lastdate,current_page,href,end_page,item,board,owner,timeper,fin){
    var retryT;
    request({
        uri: href,
        headers:{                                                                                                                                'Cookie': 'over18=1'
        },
        timeout:100000,
    }, function(error, response, body) {
        if(current_page==end_page){
            retryT=1;
        }
        else{
            retryT=(againTime+current_page);
        }
        if(typeof response === "undefined"){
            //fs.appendFile('./ptt_data/'+owner+'/'+board+'/tryagain',href+"\n");
            setTimeout(
                function(){
                    var date = new Date();
                    //fs.appendFile('./ptt_data/'+owner+'/'+board+'/tryagain_web',"t:["+date+"]"+href+"\n");
                    lookp(lastdate,current_page,href,end_page,item,board,owner,timeper,fin);
                },
                retryT
            )
        }
        else if(response.statusCode!==200){
            //fs.appendFile('./ptt_data/'+owner+'/'+board+'/log_web_article.txt', "--->["+current_page+"]page response:"+response.statusCode+'\n'+"uri:"+'https://www.ptt.cc/bbs/'+board+'/index'+current_page+'.html'+"\n");
            if(response.statusCode===503){
                setTimeout(
                    function(){
                        var date = new Date();
                        //fs.appendFile('./ptt_data/'+owner+'/'+board+'/tryagain_web',"t:["+date+"]"+href+"\n");
                        lookp(lastdate,current_page,href,end_page,item,board,owner,timeper,fin);
                    },
                    retryT
                )
            }
        }
        else{
            myBot.checklist(body,end_page,function(listnum){
                //console.log("new item num:"+listnum);
                //console.log("current_page:"+current_page+" end_page:"+end_page);
                if(current_page>=end_page){
                    fs.writeFile('./ptt_data/'+owner+'/'+board+'/item.txt',listnum);
                }
                var s_links=0;
                var r_links=0;
                myBot.start(s_links,r_links,lastdate,current_page,item,body,board,end_page,owner,timeper,function(cnt,reach){

                    var date = new Date();
                    link_count +=cnt;
                    if(current_page==end_page){
                        firstp_flag=1;
                    }
                    fin(reach);
                    return;
                });

            });
        }
    });
}

exports.crawlIndex=crawlIndex;
