var myBot = require('./bot/web_pttbot.js');
var request = require('request');
var http = require('http');
var fs = require('graceful-fs');
var iconv = require('iconv-lite');
var cheerio = require("cheerio");
var S = require('string');
var he = require('he');
var HashMap = require('hashmap');

var dateFormat = require('dateformat');
var now = new Date();

var link_count=0;
var maxRetry=50;

var dir;
var interval;
var againTime;
var nextBoardt;
var startnum;

var stop_flag=0;
var firstp_flag=0;

function start(url,toDir,fin){
    var board_name = S(url).between('bbs/','/index').s;
    run_bot(toDir,board_name,function(mark,name,bname,index,item,lastdate){
        if(mark==-1){
            console.log("run_bot error");   
        }
        /*
        else if(mark==1){
            console.log(bname+" is exists.");
            fs.appendFile("./crawled.dir",bname+"\n",function(){});
            fin(bname);
        }
        */
        else{
            var s_pages=0;
            var r_pages=0;
            console.log("name:"+name+" bname:"+bname+" url:"+url+" lastdate:"+lastdate);
            crawlIndex(s_pages,r_pages,name,bname,index,item,lastdate,function(stat){
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
        createDir(owner,board,function(mark,name,bname,index,item,lastdate){
            fin(mark,name,bname,index,item,lastdate);
        });
        //create folder or use existing
    }
    catch(e){
        console.log("[error] run_bot:"+e);
        fin(-1,0,0,0,0,0,0);
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
                                        fin(1,owner,board,index,item,lastdate);
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
                index=1;
                item=0;
                lastdate=0;
                console.log("no "+ dir+"/"+owner+"/"+board);
                fs.mkdir(dir,function(){
                    console.log("create:"+dir);
                    fs.mkdir(dir+"/"+owner,function(){
                        console.log("create:"+dir+"/"+owner);
                        fs.mkdir(dir+"/"+owner+"/"+board,function(){
                            console.log("create:"+dir+"/"+owner+"/"+board);
                            fs.writeFile(dir+'/'+owner+"/"+board+'/index.txt','1');
                            fs.writeFile(dir+'/'+owner+"/"+board+'/item.txt','0');
                            fs.writeFile(dir+'/'+owner+"/"+board+'/lastdate.txt','0');
                            fin(0,owner,board,index,item,lastdate);
                        });	
                    });	
                });
            }
        });
    }
    catch(e){
        console.log("[error] createDir:"+e);
        status=1;
        fin(-1,0,0,0,0,0);

    }
}
function crawlIndex(s_pages,r_pages,name,board,index,item,lastdate,fin)
{
    var page_record = new HashMap();
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
            if(error=="Error: ETIMEDOUT"||error=="Error: ESOCKETTIMEDOUT"){
                console.log("["+board+"]"+error+" again!");
                setTimeout(
                    function(){
                        console.log(error+" start!");
                        crawlIndex(s_pages,r_pages,name,board,index,item,lastdate,fin);
                    },
                    10*1000
                );
            }
            else{
                console.log("["+board+"]error:"+error);
                crawlIndex(s_pages,r_pages,name,board,index,item,lastdate,fin);
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
                if($('div').is('#prodlist')){
                    status = "skip";
                }
                else{
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

            }
            catch(e){
                status="false";
                console.log(e);
            }
            finally{
                var time2 = new Date();
                fs.writeFile('./ptt_data/'+name+'/'+board+'/lastdate.txt',time2);

                var date = dateFormat(new Date(), "yyyymmdd");
                if(status=="skip"){
                    fin(board);
                    return;
                }
                else if(status!="false"){
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
                    }
                    fin('false');
                    return;
                }
                if(page==""){
                    console.log("["+board+"]Page not get, again!");
                    //console.log("["+board+"]Page not get, again!:"+body);
                    crawlIndex(s_pages,r_pages,name,board,index,item,lastdate,fin);
                }
                else{
                    /*
                    var nextb_time=1;
                    if(lastdate==0){
                        nextb_time=index;
                    }
                    else{
                        nextb_time = page-index;
                        if(nextb_time<0){
                            nextb_time = 60;
                        }
                        else if(nextb_time>600){
                            nextb_time = 600;
                        }
                    }
                    console.log("--Next board time:"+nextb_time+"--");
                    setTimeout(
                        function(){
                            console.log("--Next board start--");
                            fin(board);
                        },
                        nextb_time*1000
                    );
                    */
                    if(index==0){
                        index=1;
                    }
                    console.log("lastdate:"+lastdate+" index:"+index+" item:"+item+" total page:"+page);
                    var i = page;
                    var stop_num = page-index;

                    if(stop_num<0){
                        stop_num=10;
                    }
                    else if(stop_num==0){
                        stop_num=1;
                    }
                    else if(index!=0){
                        stop_num=stop_num+1;
                    }

                    var j,k;
                    if(index>page){
                        index = page-20;
                    }
                    if(item==20&&page==index){
                        for(j=page;j>=index;j--){
                            page_record.set(j,"1");
                        }
                    }
                    else{
                        var stop_index;
                        if(item==20){
                            stop_index = index-1;
                        }
                        else{
                            stop_index = index;
                        }
                        for(j=page;j>=stop_index;j--){
                            page_record.set(j,"-1");
                        }
                    }

                    var tag = setInterval(function(){
                        //console.log("["+i+"]stop_num:["+stop_num+"]["+board+"]s_pages:"+s_pages);

                            //else{
                                var url = "https://www.ptt.cc/bbs/"+board+"/index"+i+".html";
                                    s_pages++;
                                    lookp(0,index,s_pages,lastdate,i,url,page,item,board,name,interval,function(reach,spage){
                                        page_record.set(spage,"1");
                                        var page_ncrawled=0;
                                        //console.log("["+board+"] page_record length:"+page_record.values().length);
                                        for(k=0;k<page_record.values().length;k++){
                                            if(page_record.values()[k]=="-1"){
                                                page_ncrawled++;
                                            }
                                        }
                                        //console.log("["+board+"] reach:"+reach);
                                        //console.log("["+board+"] page not crawled:"+page_ncrawled);
                                        
                                        if(reach=="STOP"){
                                            clearInterval(tag);
                                        }
                                        r_pages++;
                                        if(reach=="END"||reach=="STOP_PAGE"||reach=="STOP_LINK"){
                                            console.log("--Page ["+spage+"] DONE--");
                                            //if(firstp_flag==1){
                                            //if(firstp_flag==1&&page_ncrawled<=5){
                                                clearInterval(tag);
                                                fin(board);
                                                //return;
                                            //}
                                        }
                                    });
                                i--;
                                if(i<=0){
                                    s_pages++;
                                    if(lastdate==0){
                                        console.log("--[FIRST] to the end--");
                                    }
                                    clearInterval(tag);
                                }
                            //}
                    },10*1000);
                }

            }
        }

    });
}

function lookp(retryc,lastindex,s_pages,lastdate,current_page,href,end_page,item,board,owner,timeper,fin){
    //console.log("current_page:"+current_page);
    //return;
    var retryT=10000;
    request({
        uri: href,
        headers:{                                                                                                                                'Cookie': 'over18=1'
        },
        timeout:12000,
        pool:{
            maxSockets:Infinity
        }
    }, function(error, response, body) {
        if(error){
            //console.log("1.["+board+"]["+current_page+"]error:"+error.code+" connection timeout:"+error.connect);
            retryc++;
            if(retryc>maxRetry){
                fs.appendFile("./logs/retry.false","["+board+"]["+current_page+"] href:"+href,function(){});
                if(current_page==end_page){
                    firstp_flag=1;
                }
                fin(0,current_page);
                return;
            }
            else{
                setTimeout(
                    function(){
                        var date = new Date();
                        //fs.appendFile('./ptt_data/'+owner+'/'+board+'/tryagain_web',"t:["+date+"]"+href+"\n");
                        lookp(retryc,lastindex,s_pages,lastdate,current_page,href,end_page,item,board,owner,timeper,fin);
                    },
                    retryT
                )
            }
        }
        else{
            if(current_page==end_page){
                retryT=1;
            }
            else{
                retryT=(againTime+current_page);
            }
            if(typeof response === "undefined"){
                 //console.log("1.["+board+"]["+current_page+"]error:response undefined");
                //fs.appendFile('./ptt_data/'+owner+'/'+board+'/tryagain',href+"\n");
                 retryc++;
                 if(retryc>maxRetry){
                     fs.appendFile("./logs/retry.false","["+board+"]["+current_page+"] href:"+href,function(){});
                     if(current_page==end_page){
                         firstp_flag=1;
                     }
                     fin(0,current_page);
                     return;
                 }
                 else{
                     setTimeout(
                         function(){
                             var date = new Date();
                             //fs.appendFile('./ptt_data/'+owner+'/'+board+'/tryagain_web',"t:["+date+"]"+href+"\n");
                             lookp(retryc,lastindex,s_pages,lastdate,current_page,href,end_page,item,board,owner,timeper,fin);
                         },
                         retryT
                     )

                 }

            }
            else if(response.statusCode!==200){
                if(response.statusCode===404){
                    if(current_page==end_page){
                        firstp_flag=1;
                    }
                    fin(0,current_page);
                    return;
                }
                //fs.appendFile('./ptt_data/'+owner+'/'+board+'/log_web_article.txt', "--->["+current_page+"]page response:"+response.statusCode+'\n'+"uri:"+'https://www.ptt.cc/bbs/'+board+'/index'+current_page+'.html'+"\n");
                else if(response.statusCode===503){
                    retryc++;
                    if(retryc>maxRetry){
                        fs.appendFile("./logs/retry.false","["+board+"]["+current_page+"] href:"+href,function(){});
                        if(current_page==end_page){
                            firstp_flag=1;
                        }
                        fin(0,current_page);
                        return;
                    }
                    else{
                        setTimeout(
                            function(){
                                var date = new Date();
                                //fs.appendFile('./ptt_data/'+owner+'/'+board+'/tryagain_web',"t:["+date+"]"+href+"\n");
                                lookp(retryc,lastindex,s_pages,lastdate,current_page,href,end_page,item,board,owner,timeper,fin);
                            },
                            retryT
                        )
                    }
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
                    myBot.start(lastindex,s_pages,s_links,r_links,lastdate,current_page,item,body,board,end_page,owner,timeper,function(reach,spage){

                        var date = new Date();
                        if(current_page==end_page){
                            firstp_flag=1;
                        }
                        fin(reach,spage);
                        return;
                    });

                });
            }

        }

    });
}

exports.crawlIndex=crawlIndex;
