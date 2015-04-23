var fs = require('fs');
var iconv = require('iconv-lite');
var cheerio = require("cheerio");
var S = require('string');
var he = require('he');
var moment = require('moment');
var dateFormat = require('dateformat');
var request = require('request');
var striptags = require('striptags');

var page_link;
var article_link = Array();

try {
    service = JSON.parse(fs.readFileSync('./data/service'));
    var md5ip = service['md5ip'];
    var md5port = service['md5port'];
    var idip = service['idip'];
    var idport = service['idport'];

}
catch (err) {
    console.error(err);
process.exit(9);
}

function convert(body,board,page,date,url){
		var id,md5,title,author,thirdc,fourthc,time,content,reply_name,D,source,U,C,K,preview;
		var content_temp;
		var date = dateFormat(date, "yyyymmdd_HHMM");
		getid(function(result){
				id = '@\n@id:'+result+'\n';
				//fs.appendFile('./ptt_data/'+board+'/'+date+'_ptt.rec', iconv.encode(id,'utf-8'),function (err) {});

				D = '@D:ptt\n';
				source = '@S:ptt\n';
				U = '@U:'+url+'\n';
				C = '@C:'+board+'\n';
				K = '@K:\n';
				
				id = he.decode(id);
				D = he.decode(D);
				source = he.decode(source);
				U = he.decode(U);
				C = he.decode(C);
				K = he.decode(K);

				var $ = cheerio.load(body);
							left = $("body > div > div.bbs-screen.bbs-content > article-metaline-right");
							left = S(left).s;
							title = $("body > div > div.bbs-screen.bbs-content > div:nth-child(3).article-metaline > span:nth-child(2).article-meta-value");
							author = $("body > div > div.bbs-screen.bbs-content > div:nth-child(1).article-metaline > span:nth-child(2).article-meta-value");
							
							//may be a four row:發信人,標題,發信站,轉信站
							thirdc = $("body > div > div.bbs-screen.bbs-content > div:nth-child(4).article-metaline > span:nth-child(1).article-meta-tag");
							thirdc = S(thirdc).between('<span class="article-meta-tag">','</span>').s;
							thirdc = he.decode(thirdc);
							if(thirdc=='發信站'){//get 轉信站 row
								fourthc = $("body > div > div.bbs-screen.bbs-content > div:nth-child(5).article-metaline > span:nth-child(2).article-meta-value");
								fourthc = S(fourthc).between('<span class="article-meta-value">','</span>').s;
							}
							else{
								fourthc='0';
							}
							
							time = $("body > div > div.bbs-screen.bbs-content > div:nth-child(4).article-metaline > span:nth-child(2).article-meta-value");
							content = $("body > div > div.bbs-screen.bbs-content");
							content_temp = content;			
							reply_content = $("body > div > div > div.push");
							
							reply = reply_content;

							//format to idb
							
							title = '@T:'+S(title).between('<span class="article-meta-value">','</span>').s+'\n';
							author = '@author:'+S(author).between('<span class="article-meta-value">','</span>').s+'\n';
							if(fourthc==0){
								temp = S(time).between('<span class="article-meta-value">','</span>').s;
							}
							else{
								temp = S(time).between('<span class="article-meta-value">','</span>').s;
								temp = S(temp).between('(',')').s;
							}
							temp = he.decode(temp);
							temp1 = temp;
							temp1 = moment(temp1,'ddd MMM DD h:mm:ss YYYY').format('YYYYMMDD hh:mm:ss');
							if(thirdc=='發信站'){

								time = '@t:'+temp1+'\n';
								fourthc = he.decode(fourthc);
								temp1 = fourthc;
								fourthc = '@from_place:'+fourthc+'\n';
							}
							else{
								time = '@t:'+temp1+'\n';
							}
							content_temp = S(content_temp).between('<span class="article-meta-value">'+temp+'</span></div>\n','--').s;
							content_temp = S(content_temp).replaceAll('\n',' ').s;
							content_temp = S(striptags(content_temp)).s;
					getmd5(content_temp,function(result){
								md5 = '@md5:'+result+'\n';
								//fs.appendFile('./ptt_data/'+board+'/'+date+'_ptt.rec', iconv.encode(md5,'utf-8'),function (err) {});
							//TODO:preview's word if is chinese will not cut clear,so currently put nothing
							//preview = '@P:'+S(content_temp).left(300).s+'\n';
							preview = '@P:\n';
							content = '@B:'+S(content).between('<span class="article-meta-value">'+temp+'</span></div>\n','--').s+"\n";
							
							

							//reply = '@reply:'+reply+'\n';


							title = he.decode(title);
							author = he.decode(author);
							time = he.decode(time);
							content = he.decode(content);
							preview = he.decode(preview);
							//reply = he.decode(reply);
							//content = S(content).replaceAll('\n','<br>').s+'\n';

								/*fs.appendFile('./ptt_data/'+board+'/'+date+'_ptt.rec', iconv.encode(D,'utf-8')+iconv.encode(source,'utf-8')+iconv.encode(U,'utf-8')+iconv.encode(C,'utf-8')+iconv.encode(K,'utf-8')+iconv.encode(time,'utf-8')+iconv.encode(title,'utf-8')+iconv.encode(preview,'utf-8')+iconv.encode(content,'utf-8'), function (err) {*/
		
								fs.appendFile('./ptt_data/'+board+'/'+date+'_ptt.rec',iconv.encode(id,'utf-8')+iconv.encode(md5,'utf-8')+iconv.encode(D,'utf-8')+iconv.encode(source,'utf-8')+iconv.encode(U,'utf-8')+iconv.encode(C,'utf-8')+iconv.encode(K,'utf-8')+iconv.encode(time,'utf-8')+iconv.encode(title,'utf-8')+iconv.encode(preview,'utf-8')+iconv.encode(content,'utf-8'), function (err) {
						 		});
	
					});
		});
}
exports.convert = convert;
function getid(fin){
	request({
		method: 'GET',
		uri:"http://"+idip+":"+idport+"/id/get/number/",
		timeout:10000
	},function(error,res,body){
		console.log(body);
		fin(body);
	});
}
function getmd5(par,fin){
	request({
		method: 'POST',
		uri:"http://"+md5ip+":"+md5port+"/api/query/getmd5",
		timeout:10000,
		body:par
	},function(error,res,body){
		console.log(body);
		fin(body);
	});
}
