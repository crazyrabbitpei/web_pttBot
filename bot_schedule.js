/*
const cp = require('child_process');
const client_bot = cp.fork(`${__dirname}/client_bot.js`);
*/
const exec = require('child_process').exec;

var fs = require('graceful-fs');
var LineByLineReader = require('line-by-line');
var HashMap = require('hashmap');
var url_map = new HashMap();
var hoturl_map = new HashMap();
var keys;//record all key from url_map
var values;//record all values from url_map
var index=0;

var date_start;
var date_end;

var list_config = JSON.parse(fs.readFileSync(`${__dirname}/getBoardname/config/setting`));
var list_name = list_config['test_list_filename'];
var hot_list_name = list_config['hot_list_filename'];

var numWorkers = require('os').cpus().length;
//console.log("numWorkers:"+numWorkers);

var toDir = "test1";

readhotURL(hot_list_name,function(msg){
    readURL(toDir,list_name,function(msg){
        date_start = new Date();
        start(toDir,keys[index]);
    });
});

function start(dir,url){
    const child = exec(`node ${__dirname}/client_bot.js `+toDir+' '+url,(error,stdout,stderr) => {
        console.log(`stdout: ${stdout}`);

        if(error !== null){
            console.log(`exec error: ${error}`);
        }
        if(stderr=='503'||stderr=='false'){
            index--;
            console.log(url+" will be crawled after 5 minutes");
            fs.appendFile(`${__dirname}/log.client_bot`,url+" will be crawled after 5 minutes",function(err){
                if(err){
                    fs.writeFile(`${__dirname}/log.client_bot.err`,err,function(){});
                }
            });
            setTimeout(function(){
                console.log("Again start crawling "+keys[index]);
                date_start = new Date();
                start(dir,url);
            },300*1000);
        }
        else if(stderr !== null){
            if(stderr==''){
                index++;
                date_end = new Date();
                fs.appendFile(`${__dirname}/log.client_bot`,'['+keys[index]+']\n'+date_start+'\n'+date_end+'\n',function(err){
                    if(err){
                        fs.writeFile(`${__dirname}/log.client_bot.err`,err,function(){});
                    }
                    if(index==values.length){
                        console.log("All boards crawled:"+index);
                    }
                });

                if(index<values.length){
                    if(typeof hoturl_map.get(url)!="undefined"){
                        index++;
                    }
                    if(index==values.length){
                        console.log("All boards crawled:"+index);
                    }
                    else{
                        console.log("Waiting...next board is "+keys[index]);
                        setTimeout(function(){
                            console.log("Start crawling "+keys[index]);
                            date_start = new Date();
                            start(dir,keys[index]);
                        },60*1000);
                    }
                }
            }
            else{
                console.log(`stderr:[${stderr}]`);
                fs.appendFile(`${__dirname}/log.client_bot.err`,stderr+'\n',function(err){
                    if(err){
                        fs.writeFile(`${__dirname}/log.client_bot.err`,err,function(){});
                    }
                });
            }
        }

    });
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
        console.log("read ptt url list done");
        keys = url_map.keys();
        values = url_map.values();
        if(typeof hoturl_map.get(keys[index]) !="undefined"){
            index++;
        }
        fin("read ptt url list done");
        //date_start = new Date();
        //client_bot.send(keys[index]);
        //start(dir,keys[index]);
    });
}


