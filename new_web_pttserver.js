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

run_bot("peipei",startnum,function(name,bname,index,item,lastdate){
    if(name==0||bname==0){
        console.log("run_bot error");   
    }
    else{
        console.log("name:"+name+" bname:"+bname);
        crawlIndex(name,bname,index,item,lastdate,function(){
            console.log("done");           
        });
    }
});

function run_bot(owner,snum,fin){
    //read service information
    try{
        var boards;
        service = JSON.parse(fs.readFileSync('./service/'+owner+'/service1'));
	if(process.argv[2]){
        	boards = process.argv[2];
	}
	else{
		console.log("board name?");
		process.exit();
		return;
	}
	if(boards==""){
		console.log("board name?");
		process.exit();
		return;
	}
        //boards = service['boards'];
        dir = service['data_dir'];
        interval = service['intervalPer'];
        againTime = parseInt(service['againTime']);
        nextBoardt = parseInt(service['nextBoardt']);
	//single version
	createDir(owner,boards,function(name,bname,index,item,lastdate){
		fin(name,bname,index,item,lastdate);
	});
        //create folder or use existing
	/*
        for(var i=0;i<boards.length;i++){
            createDir(owner,boards[i].name,function(name,bname,index,item,lastdate){
                //console.log(name+"/"+bname+" dir created done"+" index:"+index+" item:"+item);
                fin(name,bname,index,item,lastdate);
            });
        }
	*/
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
    //finally{
    //if(status==0){
    //console.log("->index:"+index);
    //console.log("->item:"+item);
    //fin(owner,board,index,item);
    //}
    //else{
    //fin(0,0,0,0);
    //}
    //} 
}
function crawlIndex(name,board,index,item,lastdate)
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
            /*
            if(page<index){
                console.log("PTT server error");
                return;
            }
            */
            //else{
                fs.writeFile('./ptt_data/'+name+'/'+board+'/index.txt', page);
            //}
        }
        catch(e){
            status="false";
        }
        finally{
            if(status=="false"){
		console.log("error:"+error+"\n"+body+"\n"+response.statusCode);
                return;
            }
            else{
                console.log("lastdate:"+lastdate+" index:"+index+" item:"+item+" total page:"+page);
                var i = page;
                var tag = setInterval(function(){
                    if(lastdate==0){
                        if(i<=0){
                            console.log("to the end");
                            fs.writeFile('./service/'+name+'/links_count', link_count);
                            clearInterval(tag);
                            return;
                        }
                    }
                    
                    var url = "https://www.ptt.cc/bbs/"+board+"/index"+i+".html";
                    if(index!=i){
                        lookp(lastdate,i,url,page,19,board,name,interval,function(reach){
                            if(reach==1){
                                console.log("reach date");
                                fs.writeFile('./service/'+name+'/links_count', link_count);
                                clearInterval(tag);
                                return;
                            }
                        });
                    }
                    else{
                        lookp(lastdate,i,url,page,item,board,name,interval,function(reach){
                            if(reach==1){
                                console.log("reach date");
                                fs.writeFile('./service/'+name+'/links_count', link_count);
                                clearInterval(tag);
                                return;
                            }
                        });
                    }
                    i--;
                },interval);
            }

        }
    });

}

function lookp(lastdate,current_page,href,end_page,item,board,owner,timeper,fin){
    request({
        uri: href,
        headers:{                                                                                                                                'Cookie': 'over18=1'
        },
        timeout:100000,
    }, function(error, response, body) {
        if(typeof response == "undefined"){
            //fs.appendFile('./ptt_data/'+owner+'/'+board+'/tryagain',href+"\n");
            setTimeout(
                function(){
                    var date = new Date();
                    //fs.appendFile('./ptt_data/'+owner+'/'+board+'/tryagain_web',"t:["+date+"]"+href+"\n");
                    lookp(lastdate,current_page,href,end_page,item,board,owner,timeper,fin);
                },
                againTime+(current_page*1000)
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
                    againTime+(current_page*1000)
                )
            }
        }
        else{
            myBot.checklist(body,end_page,function(listnum){
                //console.log("new item num:"+listnum);
                console.log("current_page:"+current_page+" end_page:"+end_page);
                if(current_page>=end_page){
                    fs.writeFile('./ptt_data/'+owner+'/'+board+'/item.txt',listnum);
                }

                myBot.start(lastdate,current_page,item,body,board,end_page,owner,timeper,function(cnt,reach){
                    var date = new Date();
                    link_count +=cnt;
                    fin(reach);
                    return;
                });

            });
        }
    });
}

exports.crawlIndex=crawlIndex;
