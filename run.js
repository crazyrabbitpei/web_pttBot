var web_pttserver = require('./web_pttserver.js');
var CronJob = require('cron').CronJob;
var fs = require('graceful-fs');
var HashMap = require('hashmap');

var board_info = new HashMap();
var boards_list = [];
var dir;
var interval;
var againTime;
var nextBoardt;
var startnum=0;
var job=0;


run_bot("peipei",startnum,function(cnt,name,bname,index,item,lastdate){
    if(name==0||bname==0){
        console.log("run_bot error");   
    }
    else{
        console.log("NO."+cnt+" =>name:"+name+" bname:"+bname);
        //boards_list.push(bname);
        //console.log("length:"+boards.length+"=>"+boards[boards.length-1]);
        setBot(0,name,bname,index,item,lastdate);
    }
});


function setBot(cnt,name,bname,index,item,lastdate){
    //new CronJob('59 37,59 4,12,20,23,00 * * *', function() {
    new CronJob('00 25 22 * * *', function() {
        web_pttserver.crawlIndex(name,bname,index,item,lastdate,function(){
            console.log(" name:"+bname+" done");
        });
    }, null, true, 'Asia/Taipei');
}

function run_bot(owner,snum,fin){
    //read service information
    try{
        var boards;
        service = JSON.parse(fs.readFileSync('./service/'+owner+'/service'));
        boards = service['boards'];
        dir = service['data_dir'];
        interval = service['intervalPer'];
        againTime = parseInt(service['againTime']);
        nextBoardt = parseInt(service['nextBoardt']);
       
        exports.dir = dir;
        exports.interval = interval;
        exports.againTime = againTime ;
        exports.nextBoardt = nextBoardt;
        exports.startnum = startnum ;
        //create folder or use existing
        for(var i=0;i<boards.length;i++){
            //boards_list.push(boards[i].name);
            createDir(i,owner,boards[i].name,function(cnt,name,bname,index,item,lastdate){
                //console.log(name+"/"+bname+" dir created done"+" index:"+index+" item:"+item);
                fin(cnt,name,bname,index,item,lastdate);
            });
        }
    }
    catch(e){
        console.log("[error] run_bot:"+e);
        fin(0,0,0,0,0,0);
    }
}
function createDir(cnt,owner,board,fin){
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
                                        fin(cnt,owner,board,index,item,lastdate);
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
                            fin(cnt,owner,board,index,item,lastdate);
                        });	
                    });	
                });
            }
        });
    }
    catch(e){
        console.log("[error] createDir:"+e);
        status=1;
        fin(0,0,0,0,0,0);

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


