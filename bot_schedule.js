'use strict'
/*
const cp = require('child_process');
const client_bot = cp.fork(`${__dirname}/client_bot.js`);
*/
const exec = require('child_process').exec;
var dateFormat = require('dateformat');
var fs = require('graceful-fs');
var LineByLineReader = require('line-by-line');
var HashMap = require('hashmap');
var client_bot = require('./client_bot.js');
var url_map = new HashMap();
var hoturl_map = new HashMap();
var keys;//record all key from url_map
var values;//record all values from url_map

var index=0;
var real_index=index+1;
//var list_num=10;
var list_num=parseInt(process.argv[2]);
var total_list_num=parseInt(process.argv[3]);

var date_start;
var date_end;

var list_config = JSON.parse(fs.readFileSync(`${__dirname}/getBoardname/config/setting`));
var list_name = list_config['list_filename'];
var hot_list_name = list_config['hot_list_filename'];

var board_flag="";

//var numWorkers = require('os').cpus().length;
//console.log("numWorkers:"+numWorkers);

readhotURL(hot_list_name,function(msg){
    init(list_num);
});

function init(lnum){
    var toDir = "test1";
    var i;
    url_map.clear();
    board_flag="";
    index=0;
    real_index=index+1;
    readURL(toDir,list_name+lnum+"_split",function(msg){
        console.log("["+list_num+"] ["+real_index+"] Start crawling "+keys[index]);
        date_start = new Date();
        start(toDir,keys[index]);
    });

}

function start(dir,url){
    //const child = exec(`/bin/bash -c node ${__dirname}/client_bot.js `+toDir+' '+url,(error,stdout,stderr) => {
    var callCrawler = new Promise(function(resolve,reject){
        client_bot.start(url,dir,function(result){
            console.log("Back:"+result);
            if(result=='503'||result=='false'){
                var date = dateFormat(new Date(), "yyyymmdd");
                //index--;
                console.log(url+" will be crawled after 0.5 minutes");
                fs.appendFile(`${__dirname}/logs/again_`+date+`.log`,url+" will be crawled after 1 minutes\n",function(err){
                    if(err){
                        fs.appendFile(`${__dirname}/logs/err_`+date+`.log`,"1.start:"+err,function(){});
                    }
                });
                resolve("AGAIN,"+dir+","+url+","+list_num);
            }
            else{
            //else if(result!='404'){
                if(url_map.get(result)!=1){
                    url_map.set(result,1);
                    real_index=index+1;
                    console.log("["+list_num+"]["+real_index+"]result:"+result);
                    if(result!="404"){
                        var date = dateFormat(new Date(), "yyyymmdd");
                        date_end = new Date();
                        fs.appendFile(`${__dirname}/logs/ok_board_`+date+`.timelog`,'['+keys[index]+']\n'+date_start+'\n'+date_end+'\n',function(err){
                            if(err){
                                console.log("error occur");
                                fs.appendFile(`${__dirname}/logs/err_`+date+`.log`,"2.start:"+err,function(){});
                            }
                        });
                    }
                    index++;
                    real_index=index;
                    if(index<values.length){
                        if(index==values.length){
                            let num1 = real_index;
                            let num2 = list_num;
                            console.log("1.["+num2+"]All boards crawled:"+num1);
                            //console.log("1.["+list_num+"]All boards crawled:"+real_index);
                            fs.appendFile(`${__dirname}/logs/ok_list_`+date+`.log`,'['+num2+']\n'+"All boards crawled:"+num1+"\n",function(err){
                                if(err){
                                    fs.appendFile(`${__dirname}/logs/err_`+date+`.log`,"3.start:"+err,function(){});

                                }
                            });
                            list_num++;
                            console.log("1.Next list:"+list_num);
                            if(list_num>total_list_num){
                                let num = list_num-1;
                                console.log("1.All list crawled:"+num);
                                resolve("DONE,"+dir+","+url+","+num);
                            }
                            else{
                                resolve("NEXTLIST,"+dir+","+url+","+list_num);
                            }
                        }
                        else{
                            /*
                            setTimeout(function(){
                                //start(dir,keys[index]);
                                resolve("NEXTURL,"+dir+","+keys[index]+","+list_num);
                            },5*1000);
                            */
                            //console.log("dir:"+dir+" url:"+keys[index]+" list_num:"+list_num);
                            
                            resolve("NEXTURL,"+dir+","+keys[index]+","+list_num);
                        }
                    }
                    else if(index==values.length){
                        let num1 = real_index;
                        let num2 = list_num;
                        console.log("2.["+num2+"]All boards crawled:"+num1);
                        fs.appendFile(`${__dirname}/logs/ok_list_`+date+`.log`,'['+num2+']\n'+"All boards crawled:"+num1+"\n",function(err){
                            if(err){
                                fs.appendFile(`${__dirname}/logs/err_`+date+`.log`,"4.start:"+err,function(){});

                            }
                        });
                        list_num++;
                        //console.log("total_list_num:"+total_list_num);
                        if(list_num>total_list_num){
                            let num = list_num-1;
                            console.log("2.All list crawled:"+num);   
                            resolve("DONE,"+dir+","+url+","+num);
                        }
                        else{
                            //init(list_num);
                            resolve("NEXTLIST,"+dir+","+keys[index-1]+","+list_num);
                        }
                    }
                }
                else{
                    real_index=index;
                    let num1 = real_index;
                    let num2 = list_num;
                    console.log("3.["+num2+"]["+num1+"]has cralwed => result:"+result);
                    if(result=="404"){
                        index++;
                        real_index=index;
                    }
                    if(index==values.length){
                        console.log("3.["+num2+"]All boards crawled:"+num1);
                        fs.appendFile(`${__dirname}/logs/ok_list_`+date+`.log`,'['+num2+']\n'+"All boards crawled:"+num1+"\n",function(err){
                            if(err){
                                fs.appendFile(`${__dirname}/logs/err_`+date+`.log`,"4.start:"+err,function(){});

                            }
                        });
                        if(list_num>total_list_num){
                            let num = list_num-1;
                            console.log("3.All list crawled:"+num);   
                            resolve("DONE,"+dir+","+url+","+num);
                        }
                        else{
                            resolve("NEXTLIST,"+dir+","+keys[index-1]+","+list_num);
                        }
                    }
                    else{
                        resolve("NEXTURL,"+dir+","+keys[index]+","+list_num);

                    }

                }
            }
        });


    });

    callCrawler.then(function(value){
        console.log(value);
        var next_list,toDir,current_url,listnum;
        var parts = value.split(",");
        next_list = parts[0];
        toDir = parts[1];
        current_url = parts[2];
        listnum = parts[3];
        if(next_list=="NEXTURL"){//next url
            if(current_url==""){
                console.log("NO url.");
            }
            else{
                real_index=index+1;
                console.log("["+listnum+"] ["+real_index+"] Start crawling "+current_url);
                start(toDir,current_url);
            }

        }
        else if(next_list=="AGAIN"){//url again
                console.log("Again crawling after 30s..."+current_url);
                setTimeout(function(){
                    date_start = new Date();
                    start(toDir,current_url);
                },30*1000);

        }
        else if(next_list=="NEXTLIST"){//next list
            console.log("Next_list:"+next_list+" will start");
            init(listnum);
            //console.log("Next_list:"+next_list+" will start after 1 minutes...");
            /*
            setTimeout(function(){
                init(listnum);
            },1*60*1000);
            */

        }
        else{
            console.log("DONE");
        }
    }).catch(function(error){
        var date = dateFormat(new Date(), "yyyymmdd");
        console.log(error);
        fs.appendFile(`${__dirname}/logs/err_`+date+`.log`,"promise error:"+error+"\n",function(){});
    });
    //});
}


/*
client_bot.on('message',(m) => {
    console.log('['+index+']PARENT got message:', m);
    if(m=='503'||m=='false'){
        index--;
        console.log(keys[index]+" will be crawled after 5 minutes");
        fs.appendFile(`${__dirname}/log.client_bot`,keys[index]+" will be crawled after 5 minutes",function(err){
            if(err){
                fs.writeFile(`${__dirname}/log.client_bot.err`,err,function(){});
            }
        });
        setTimeout(function(){
            date_start = new Date();
            client_bot.send(keys[index]);
        },300*1000);
    }
});

client_bot.on('exit',(m) => {
    index++;
    console.log('['+index+']PARENT got message:', m);

        date_end = new Date();
        fs.appendFile(`${__dirname}/log.client_bot`,'['+m+']\n'+date_start+'\n'+date_end+'\n',function(err){
            if(err){
                fs.writeFile(`${__dirname}/log.client_bot.err`,err,function(){});
            }
            if(index==values.length){
                console.log("All boards crawled:"+index);
            }
        });

        if(index<values.length){
            if(typeof hoturl_map.get(keys[index])!="undefined"){
                index++;
            }
            if(index==values.length){
                console.log("All boards crawled:"+index);
            }
            else{
                console.log("Waiting...next board is "+keys[index]);
                //setTimeout(function(){
                    date_start = new Date();
                    client_bot.send(keys[index]);
                //},300*1000);
            }
        }
});
*/

function readhotURL(filename,fin){
    var options = {
        skipEmptyLines:false
    }
    var lr = new LineByLineReader(filename,options);
    lr.on('error', function (err) {
        // 'err' contains error object
        console.log("error:"+err);
    });
    lr.on('line', function (line) {
        //console.log(line);
        var parts = line.split("\t");
        if(parts.length==1){
            hoturl_map.set(line,0);
        }
        else if(parts.length==2){
            hoturl_map.set(parts[1],parts[0]);
        }
        
    });
    lr.on('end',function(){
        console.log("read ptt hot url list done");
        fin("read ptt hot url list done");
    });
}



function readURL(dir,filename,fin){
    var options = {
        skipEmptyLines:false
    }
    var lr = new LineByLineReader(filename,options);
    lr.on('error', function (err) {
        // 'err' contains error object
        console.log("error:"+err);
    });
    lr.on('line', function (line) {
        //console.log(line);
        var parts = line.split("\t");
        if(parts.length==1){
            url_map.set(line,0);
        }
        else if(parts.length==2){
            url_map.set(parts[1],parts[0]);
        }
        
    });
    lr.on('end',function(){
        console.log("read ptt url ["+list_num+"] list done");
        keys = url_map.keys();
        values = url_map.values();
        fin("read ptt url ["+list_num+"] list done");
    });
}


