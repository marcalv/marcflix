const express = require('express')
const path = require('path')
const exphbs = require('express-handlebars')
const app = express();
const bodyParser = require('body-parser')
const fs = require('fs-extra');
const os = require('os');
const checkDiskSpace = require('check-disk-space')
const glob = require('glob');
var isVideo = require('is-video');
const parseTorrent = require('parse-torrent')
const axios = require('axios')



//================================================================================
// CONST
//================================================================================

const PORT = process.env.PORT;
const uptime_api_key = process.env.UPTIME_KEY
const uptime_id = process.env.UTPIME_ID
const bot_token = process.env.BOT_TOKEN
const DEBUG = (process.env.DEBUG || 'missing debug env var' == "True") ? true : false
const HOSTNAME = process.env.HOSTNAME || 'http://miair.lan:8000';

//================================================================================
//WEBSERVER SETUP 
//================================================================================

//Here we are configuring express to use body-parser as middle-ware.
var urlencodedParser = bodyParser.urlencoded({ extended: false })

//Handlebars middleware
app.engine('handlebars', exphbs({defaultLayout:'main'}));
app.set('view engine', 'handlebars');

//Set static folder
app.use(express.static(path.join(__dirname,'public'))) 

//Start server
app.listen(PORT, () => console.log(`server started on port ${PORT}`));

console.log("======================================")


//================================================================================
//TELEGRAM BOT
//================================================================================

const Telegraf = require('telegraf')
const Extra = require('telegraf/extra')
const Markup = require('telegraf/markup')

const bot = new Telegraf(bot_token)

const keyboard = Markup.inlineKeyboard([
     Markup.urlButton('Open MarcFlix', HOSTNAME)
    ])

bot.start((ctx) => ctx.reply('Hello'))
bot.help((ctx) => ctx.reply('Help message'))
bot.on('message', (ctx) => {
  console.log('Message from '+ctx.message.from.username+' '+ctx.message.from.id)

  if (ctx.message.from.id == '6663869'){
    if (ctx.message.text.match(/magnet:\?xt=urn:[a-z0-9]+:[a-z0-9]{32}/i) != null){
      console.log('is magnet')
      torrent = parseTorrent(ctx.message.text)
      // keyboard = Markup.inlineKeyboard([
      //   Markup.urlButton('Open MarcFlix', HOSTNAME),
      //   Markup.callbackButton('ReSend','asdf'),
      //   Markup.button(ctx.message.text)
      // ])
      //console.log(ctx.message)
      ctx.reply(torrent.dn,Extra.markup(keyboard),true)
      addTorrent(ctx.message.text)
    }else{
      console.log('not magnet')
      ctx.reply('not magnet')
    }
  }
})

bot.on('callback_query', (ctx) => {
  ctx.answerCbQuery()
  console.log(ctx.callbackQuery.data)
  //addTorrent(ctx.message.text)
})



if (DEBUG) {
  bot.launch()
}else{
  app.use(bot.webhookCallback('/secret-path'))
  bot.telegram.setWebhook('https://tormarc.herokuapp.com/secret-path')
} 

//================================================================================
//Torrent
//================================================================================

//Create torrent download folder
if (DEBUG) {
  torrentDir = path.join(__dirname,'torrents')
}else{
  var torrentDir = ''
  createTorrentDir()
}

// Start client
var WebTorrent = require('webtorrent')
var client = new WebTorrent()


//Autoadd torrent on startup for debugging
if (DEBUG) {
  var exampleMagnetURI = "magnet:?xt=urn:btih:f59f3e4b2eb8be6e96148667ebbcc53343a13dc3&dn=The.Simpsons.S31E02.1080p.WEB.x264-TBS[rarbg]&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Feddie4.nl%3A6969&tr=udp%3A%2F%2Ftracker.pirateparty.gr%3A6969&tr=udp%3A%2F%2Fopentrackr.org%3A1337&tr=udp%3A%2F%2Ftracker.zer0day.to%3A1337"
  //addTorrent(exampleMagnetURI)
}


//================================================================================
// URL ROUTES
//================================================================================

 // HOME PAGE ROUTE
 app.get('/', function (req, res) {
  console.log("Get at /")

  res.sendFile(path.join(__dirname,'/public/index.html'))
});

// API/INFO
app.get('/api/info', (req,res) => {
    console.log("Get at /")
    Promise.all([getInfo()]).then(values => { 
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(values[0], null, 3));
    });   
})     


// /LIST
app.get('/list', (req,res) => {
  console.log("Get at /list")
  Promise.all([getInfo()]).then(values => { 
    var text=getRSS(values[0]);

    res.setHeader('Content-type', "application/octet-stream");
    res.setHeader('Content-disposition', 'attachment; filename=list.m3u8');
    res.send(text);
  });  
})    



// DOWNLOAD FILE 
app.get('/api/:infoHash/:fileNum/:filename', function(req, res){
  console.log("Get at /api/DOWNLOAD")
  let infoHash = req.params.infoHash
  let fileNum = req.params.fileNum
  let torrentObj = client.get(infoHash)
  let mypath = path.join(torrentObj.path,torrentObj.files[fileNum].path)

  res.sendFile(mypath)
 }); 


// /API/ADD
app.post('/api/add', urlencodedParser,(req,res) => {
  console.log("Post at /add, magnet: "+req.body.magnet)
  var magnetURI = req.body.magnet
  addTorrent(magnetURI)

  res.redirect('/')
})

// /API/ALIVE/ON
app.get('/api/alive/on', function (req, res) {
  console.log("Get at /api/alive/on")
    axios.post('https://api.uptimerobot.com/v2/editMonitor', {
    api_key: uptime_api_key,
    id: uptime_id,
    status: '1'
    })
    .then((res) => {
      //console.log(res.data)
    })
    .catch((error) => {
      console.error(error)
    })

  res.redirect('/')
});

// /API/ALIVE/OFF
app.get('/api/alive/off', function (req, res) {
  console.log("Get at /api/alive/off")
  axios.post('https://api.uptimerobot.com/v2/editMonitor', {
  api_key: uptime_api_key,
  id: uptime_id,
  status: '0'
  })
  .then((res) => {
    //console.log(res.data)
  })
  .catch((error) => {
    console.error(error)
  })

  res.redirect('/')
});


// API/INFO
app.get('/api/uptimestatus', (req,res) => {
  console.log("Get at /")
  Promise.all([getUptimeRobotStatus()]).then(values => { 
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(values[0], null, 3));
  });   
})    




//================================================================================
//MEGA PROMISE FUNCTIONs
//================================================================================

// Get free disk space in torrent folder
function getFreeDiskSpace() {
  return new Promise((resolve, reject) => {
    checkDiskSpace(torrentDir).then((diskSpace) => {
      resolve(formatBytes(diskSpace.free));
    })
  })
}

// Get MKV files in torrent folder
function getMkvFiles() {
  return new Promise((resolve, reject) => {
    glob(torrentDir + '/**/*.+(mkv|avi)', {}, (err, files)=>{
      resolve(files)
    })
  })
}

// Get UptimeRobot monitor status
function getUptimeRobotStatus() {
  return new Promise((resolve, reject) => {
    
      axios.post('https://api.uptimerobot.com/v2/getMonitors', {
    api_key: uptime_api_key,
    monitors: uptime_id,
    })
    .then((res) => {
      //console.log(res.data)
      resolve(res.data.monitors[0].status)
    })
    .catch((error) => {
      //console.error(error)
      resolve(error)
    })

    })
}

// Get torrent info from webtorrent api
function getTorrents(){
  let torrentSummary = []
  client.torrents.forEach( function (element){
    torrentObject = {
      name : element.name,
      infoHash : element.infoHash,
      done : element.done,
      progress : (element.progress*100).toFixed(2),
      numPeers : element.numPeers,
      paused : element.paused,
      path : element.path,
      magnetURI : element.magnetURI,
      downloadSpeed : formatBytes(element.downloadSpeed)
    }
    let files = []
      element.files.forEach((file)=>{
        files.push(file.path)
      })
    torrentObject.files = files
    torrentSummary.push(torrentObject)
  })
  return torrentSummary
}

// GetInfo function, returns promise with all info
function getInfo() {
  return new Promise((resolve, reject) => {
    Promise.all([getFreeDiskSpace(),getMkvFiles()]).then(values => { 
      let infoObj = {}
      //infoObj.UptimeRobotStatus = values[2]
      infoObj.freeSpaceDisk = values[0]
      infoObj.torrentsInfo = getTorrents()
      infoObj.files = values[1]
      infoObj.links = makeLinks(infoObj.torrentsInfo)
      
      resolve(infoObj)
    });  
});
}

//================================================================================
//FUNCTIONS
//================================================================================

//Creates and asigns torrentDir variable in tmp system folder
function createTorrentDir(){
  fs.mkdtemp(path.join(os.tmpdir(), 'foo-'), (err, folder) => {
    if (err) throw err;
    console.log('Torrent destination folder: '+folder);
    torrentDir = folder
  });
} 
  
//addTorrent to webtorrent client
function addTorrent(magnetURI){
  try{
    parseTorrent(magnetURI)

    client.add(magnetURI, { path: torrentDir }, function (torrent) {
      torrent.on('done', () => {console.log('torrent download finished')})
      torrent.on('error', (err) => {console.log(err)})
    })
  }
  catch (e){console.log(e)}
}
  
// Bytes to formated string
function formatBytes(a,b){if(0==a)return"0 Bytes";var c=1024,d=b||2,e=["Bytes","KB","MB","GB","TB","PB","EB","ZB","YB"],f=Math.floor(Math.log(a)/Math.log(c));return parseFloat((a/Math.pow(c,f)).toFixed(d))+" "+e[f]}


// Create m3u8 file with videos
function getRSS(infoObj) {
  /* lets create an rss feed */
  let m3u8Content = ''
  let line = ''
  /* loop over data and add to feed */
    infoObj.torrentsInfo.forEach((torrent)=>{
      torrent.files.forEach((file,index)=>{
        if (isVideo(path.basename(file))){
          line = '#EXTINF:-1, '+path.basename(file)+'\n'
          m3u8Content=m3u8Content.concat(line)
          line = HOSTNAME+'/api/'+torrent.infoHash+'/'+index+'/file'+path.extname(file)+'\n'
          m3u8Content=m3u8Content.concat(line)
        }
        
      })
    })

  return m3u8Content
}

//Create objects with links to videos
function makeLinks(torrentsInfo){
  let filesObj = []
  let fileObj = {}
  torrentsInfo.forEach((torrent)=>{
    torrent.files.forEach((file,index)=>{
      if (isVideo(path.basename(file))){
        fileObj = 
          { name: path.basename(file),
            url: HOSTNAME+'/api/'+torrent.infoHash+'/'+index+'/'+path.basename(file)
          }
          filesObj.push(fileObj)
      }
    })
  })
  return filesObj
}


