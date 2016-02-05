const cp = require('child_process');
const client_bot = cp.fork(`${__dirname}/client_bot.js`);

var fs = require('graceful-fs');
var LineByLineReader = require('line-by-line');
var HashMap = require('hashmap');
var url_map = new HashMap();
var keys;//record all key from url_map
var values;//record all values from url_map
var index=0;

var date_start;
var date_end;

var list_config = JSON.parse(fs.readFileSync(`${__dirname}/getBoardname/config/setting`));
var list_name = `${__dirname}`+'/getBoardname/'+list_config['list_filename'];

readURL(list_name);

client_bot.on('message',(m) => {
    index++;
    console.log('['+index+']PARENT got message:', m);
    if(m=='503'){
        index--;
        console.log(keys[index]+" will be crawled after 10 minutes");
        setTimeout(function(){
            date_start = new Date();
            client_bot.send(keys[index]);
        },600*1000);
    }
    else{
        date_end = new Date();
        fs.appendFile(`${__dirname}/log.client_bot`,'['+m+']\n'+date_start+'\n'+date_end+'\n',function(err){
            if(err){
                fs.writeFile(`${__dirname}/log.client_bot.err`,err,function(){});
            }
            if(index==values.length){
                console.log("All boards crawled:"+index);
                //process.exit();
            }
        });

        if(index<values.length){
            date_start = new Date();
            client_bot.send(keys[index]);
        }

    }
});



function readURL(filename){
    var options = {
        skipEmptyLines:false
    }
    var lr = new LineByLineReader(filename,options);
    lr.on('error', function (err) {
        // 'err' contains error object
        console.log("error:"+err);
    });
    lr.on('line', function (line) {
        console.log(line);
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
        date_start = new Date();
        client_bot.send(keys[index]);
    });
}


