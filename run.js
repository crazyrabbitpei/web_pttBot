var web_pttserver = require('./web_pttserver.js');
var CronJob = require('cron').CronJob;
new CronJob('00 */1 * * * *', function() {
        web_pttserver.run_bot();
}, null, true, 'Asia/Taipei');
