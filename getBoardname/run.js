var request = require('request');
var http = require('http');
var fs = require('graceful-fs');
var iconv = require('iconv-lite');
var cheerio = require("cheerio");
var S = require('string');
var he = require('he');
var dateFormat = require('dateformat');
var CronJob = require('cron').CronJob;

var againTime="10000";
var group_link = new Array();
var config_name = process.argv[2];
var againCount=0;



read_config(config_name,function(list_filename,door,root,groupInterval){
    fs.writeFile(list_filename,"");//clean
	grab_boardname(list_filename,door,root,groupInterval,function(stat){
		console.log(stat);
        if(stat=="done"){
            var index=0;
            var tag = setInterval(function(){
                grab_boardname(list_filename,group_link[index],root,groupInterval,function(message){
                    if(message=="false"){
                        clearInterval(tag);   
                        process.exit();
                    }
                })
                index++;
                if(index>group_link.length){
                    clearInterval(tag);   
                }
            },groupInterval);
        }
	});
});


function read_config(filename,fin)
{
    var service = JSON.parse(fs.readFileSync(filename));
	var list_filename = service["hot_list_filename"];
	var site_door =  service["site_door"];
	var root =  service["root"];
	var groupInterval =  service["groupInterval"];
    console.log("[config]\nlist_filename:"+list_filename+"\nsite_door:"+site_door+"\n--");
	fin(list_filename,site_door,root,groupInterval);

}

function grab_boardname(list_filename,door,root,groupInterval,fin)
{
    console.log("connect:"+door);
    request({
        uri: door,
        encoding:null,
        headers:{
            'Cookie': 'over18=1'
        },
        timeout:100000
    },function(error, response, body){
        if(error){
            fs.appendFile("./log","error:"+error+"\n"+body+"\n"+"url:"+door);
            fin("false");
            return;
        }
        if(typeof response == "undefined"){
            setTimeout(
                function(){
                    grab_boardname(list_filename,door,root,groupInterval,fin)
                },
                againTime+(cnt*1000)
            )
        }
        if(response.statusCode!==200){
            if(response.statusCode===503){
                setTimeout(
                    function(){
                        grab_boardname(list_filename,door,root,groupInterval,fin)
                    },
                    againTime+(cnt*1000)
                )
            }
            else{
                fs.appendFile("./log","["+response.statusCode+"]error:"+error+"\n"+body+"\n"+"url:"+door);
                fin("done");
                return;
            }
        }
        var stat="";
        var content = iconv.decode(new Buffer(body),'big5');
        try{
            var $ = cheerio.load(content);
            var link;
            var href="",hots="";
            var url="";

            if(door=="https://www.ptt.cc/hotboard.html"){
                $("div#container > div#mBody > div#mainContent > div#finds > div#prodlist > dl > dd").each(function(){
                    link = $(this).children();
                    hots = S(link).between('<td width=\"100\">&#x4EBA;&#x6C23;&#xFF1A;','</td>');

                    link = S(link).between('<td width=\"120\"><a href=\"','</a></td>');
                    href = S(link).between('','\">');
                    url = root+href;
                    console.log(url);
                    if(url.indexOf("index.html")==-1){
                        group_link.push(url);
                        fs.appendFile("./list/groupsname",url+"\n");
                    }
                    else{
                        fs.appendFile(list_filename,hots+"\t"+url+"\n");
                    }
                });

            }
            else{
                $("div#mBody > div#mainContent > div#prodlist > dl > dd > p > a").each(function(){
                    link = $(this);
                    href = link.attr("href");
                    url = root+href;
                    console.log(url);
                    if(url.indexOf("index.html")==-1){
                        group_link.push(url);
                        fs.appendFile("./list/groupsname",url+"\n");
                    }
                    else{
                        fs.appendFile(list_filename,url+"\n");
                    }
                });

            }
        }
        catch(e){
            stat="false";
        }
        finally{
            if(stat=="false"){
                fs.appendFile("./log","error:"+error+"\n"+body+"\n");
                fin(stat);
                return;
            }
            fin("done");
            return;
        }
    });
}

