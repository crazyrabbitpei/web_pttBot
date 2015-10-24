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

var link_count=0;
var dir;
var interval;

run_bot("peipei",function(name,bname,index,item){
    if(name==0||bname==0){
        console.log("run_bot error");   
    }
    else{
        console.log("name:"+name+" bname:"+bname+" index:"+index);
        crawlIndex(name,bname,index,item);
    }
});

function run_bot(owner,fin){
    //read service information
    try{
        var boards;
        service = JSON.parse(fs.readFileSync('./service/'+owner+'/service'));
        boards = service['boards'];
        dir = service['data_dir'];
        interval = service['intervalPer'];
        //create folder or use existing
        for(var i=0;i<boards.length;i++){
            createDir(owner,boards[i].name,function(name,bname,index,item){
                //console.log(name+"/"+bname+" dir created done"+" index:"+index+" item:"+item);
                fin(name,bname,index,item);
            });
        }
    }
    catch(e){
        console.log("[error] run_bot:"+e);
        fin(0,0,0,0);
    }
}
function createDir(owner,board,fin){
    var index;
    var item;
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
                                //console.log("item:"+item);
                                fin(owner,board,index,item);
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
                console.log("no "+ dir+"/"+owner+"/"+board);
                fs.mkdir(dir,function(){
                    console.log("create:"+dir);
                    fs.mkdir(dir+"/"+owner,function(){
                        console.log("create:"+dir+"/"+owner);
                        fs.mkdir(dir+"/"+owner+"/"+board,function(){
                            console.log("create:"+dir+"/"+owner+"/"+board);
                            fs.writeFile(dir+'/'+owner+"/"+board+'/index.txt','0');
                            fs.writeFile(dir+'/'+owner+"/"+board+'/item.txt','0');
                            fin(owner,board,index,item);
                        });	
                    });	
                });
            }
        });
    }
    catch(e){
        console.log("[error] createDir:"+e);
        status=1;
        fin(0,0,0,0);

    }
    /*
       finally{
       if(status==0){
       console.log("->index:"+index);
       console.log("->item:"+item);
       fin(owner,board,index,item);
       }
       else{
       fin(0,0,0,0);
       }
       } 
       */

}
function crawlIndex(name,board,index,item)
{
    //get new page
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
            var page = parseInt(S(get_page.attr('href')).between('index','.html').s)+1;
            fs.writeFile('./ptt_data/'+name+'/'+board+'/index.txt', page);

        }
        catch(e){
            status="false";
            //console.log("error:"+error+" statusCode"+response.statusCode);
            //fs.writeFile('./ptt_data/'+name+'/'+board+'/log_web_article.txt', "false---->\n"+body+'\nhttps://www.ptt.cc/bbs/'+board+'/index'+index+'.html');
        }
        finally{
            if(status=="false"){
                return;
            }
            else{
                //fs.writeFile('./ptt_data/'+name+'/'+board+'/data.txt', body);
                console.log("index:"+(index+1)+" total page:"+page);
                var i = index+1;
                var tag = setInterval(function(){
                    if(i>=page){
                        fs.writeFile('./service/'+name+'/links_count', link_count);
                        clearInterval(tag);
                    }
                    var url = "https://www.ptt.cc/bbs/"+board+"/index"+i+".html";
                    //console.log(url);
                    lookp(i,url,page,board,name,interval);
                    i++;
                },interval);
            }

        }
    });

}

function lookp(current_page,href,page,board,owner,timeper){
    request({
        uri: href,
        headers:{                                                                                                                                'Cookie': 'over18=1'
        },
        timeout:100000,
    }, function(error, response, body) {
        if(typeof response == "undefined"){
            lookp(current_page,href,page,board,owner,timeper);
        }
        else if(response.statusCode!==200){
            //fs.appendFile('./ptt_data/'+owner+'/'+board+'/log_web_article.txt', "--->["+current_page+"]page response:"+response.statusCode+'\n'+"uri:"+'https://www.ptt.cc/bbs/'+board+'/index'+current_page+'.html'+"\n");
            if(response.statusCode===503){
                lookp(current_page,href,page,board,owner,timeper);
            }
        }
        else{
            //myBot.checklist(body,page,function(listnum){

            myBot.start(current_page,body,board,page,owner,timeper,function(cnt){
                link_count +=cnt;
                //console.log("now links:"+link_count);
            });

            //});
        }
    });
}

exports.run_bot=run_bot;
