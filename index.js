const express = require('express')
const path = require('path')
const exphbs = require('express-handlebars')
const app = express();
const bodyParser = require('body-parser')
const fs = require('fs-extra');
const os = require('os');
const checkDiskSpace = require('check-disk-space')
const glob = require('glob');
const RSS = require('rss');
var xml = require('xml');
var isVideo = require('is-video');
const parseTorrent = require('parse-torrent')
const axios = require('axios')

//Here we are configuring express to use body-parser as middle-ware.
//app.use(bodyParser.urlencoded({ extended: false }));
var urlencodedParser = bodyParser.urlencoded({ extended: false })
var jsonParser = bodyParser.json();

//Handlebars middleware
app.engine('handlebars', exphbs({defaultLayout:'main'}));
app.set('view engine', 'handlebars');


//TELEGRAM BOT



const Telegraf = require('telegraf')
const Extra = require('telegraf/extra')
const Markup = require('telegraf/markup')

const keyboard = Markup.inlineKeyboard([
  Markup.urlButton('Open MarcFlix', 'https://tormarc.herokuapp.com'),
])



const bot = new Telegraf('975230773:AAGLCmIVgZWzEItFoLrkF_9eV5-ZFz4Qlio')
app.use(bot.webhookCallback('/secret-path'))
bot.telegram.setWebhook('https://tormarc.herokuapp.com/secret-path')

//bot.start((ctx) => ctx.reply('Hello'))
//bot.help((ctx) => ctx.reply('Help message'))
bot.on('message', (ctx) => {
  console.log('Message from '+ctx.message.from.username+' '+ctx.message.from.id)

  if (ctx.message.from.id == '6663869'){
    if (ctx.message.text.match(/magnet:\?xt=urn:[a-z0-9]+:[a-z0-9]{32}/i) != null){
      console.log('is magnet')
      ctx.reply('Adding magnet',Extra.markup(keyboard))
      addTorrent(ctx.message.text)
    }else{
      console.log('not magnet')
      ctx.reply('not magnet')
    }
  }

  
  
  })
bot.launch()

//ENDING -------- TELEGRAM BOT

//Torrent
var torrentDir = ''
createTorrentDir()
//torrentDir = path.join(__dirname,'torrents')

var WebTorrent = require('webtorrent')
var client = new WebTorrent()
var exampleMagnetURI = "magnet:?xt=urn:btih:f59f3e4b2eb8be6e96148667ebbcc53343a13dc3&dn=The.Simpsons.S31E02.1080p.WEB.x264-TBS[rarbg]&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Feddie4.nl%3A6969&tr=udp%3A%2F%2Ftracker.pirateparty.gr%3A6969&tr=udp%3A%2F%2Fopentrackr.org%3A1337&tr=udp%3A%2F%2Ftracker.zer0day.to%3A1337"


//addTorrent(exampleMagnetURI)

//Homepage route
app.get('/api/info', (req,res) => {
    console.log("Get at /")

    Promise.all([getInfo()]).then(values => { 
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(values[0], null, 3));
    });   
})     

//Homepage route
app.get('/list', (req,res) => {
  console.log("Get at /list")
  Promise.all([getInfo()]).then(values => { 
    //res.setHeader('Content-Type', 'application/json');
    //res.end(JSON.stringify(values[0], null, 3));
    //console.log(values[0])
    //res.set('Content-Type', 'text/xml');
    var text=getRSS(values[0]);
    res.setHeader('Content-type', "application/octet-stream");
    res.setHeader('Content-disposition', 'attachment; filename=list.m3u8');
    res.send(text);

  });  

})    



//Download file route
app.get('/api/:infoHash/:fileNum/:filename', function(req, res){
  console.log("Get at /api/DOWNLOAD")
  let infoHash = req.params.infoHash
  let fileNum = req.params.fileNum
  let torrentObj = client.get(infoHash)
  let mypath = path.join(torrentObj.path,torrentObj.files[fileNum].path)
  res.sendFile(mypath)
  
 }); 

 app.get('/', function (req, res) {
  console.log("Get at /")
  res.sendFile(path.join(__dirname,'index.html'))
});

//Add Torrent route
app.post('/api/add', urlencodedParser,(req,res) => {
  console.log("Post at /add, magnet: "+req.body.magnet)
  var magnetURI = req.body.magnet
  addTorrent(magnetURI)
  //response
  res.redirect('/')
  //res.setHeader('Content-Type', 'application/json');
  //res.end(JSON.stringify({ response: 'ok' }, null, 3));
})

const uptime_api_key = 'u813039-dcc893686f8a5a616b09d557'
const uptime_id = '783690536'

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
      //console.error(error)
    })

  res.redirect('/')
});

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
    //console.error(error)
  })

res.redirect('/')
});





//Set static folder
app.use(express.static(path.join(__dirname,'public'))) 


//INICIO
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => console.log(`server started on port ${PORT}`));

const HOSTNAME = process.env.HOSTNAME || 'http://miair.lan:8000';

console.log("======================================")

//addTorrent("magnet:?xt=urn:btih:04AF2550620D2322A01E1485F1A80B1A956EFB72&dn=%5Bzooqle.com%5D%20Game%20of%20Thrones%20S08E06%201080p%20WEB%20H264-MEMENTO%5Bettv%5D&tr=http://explodie.org:6969/announce&tr=http://announce.xxx-tracker.com:2710/announce&tr=http://tracker1.itzmx.com:8080/announce&tr=http://open.acgtracker.com:1096/announce&tr=https://bigfoot1942.sektori.org/announce&xl=4690910194&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=http%3A%2F%2Fexplodie.org%3A6969%2Fannounce&tr=http%3A%2F%2Ftracker1.itzmx.com%3A8080%2Fannounce&tr=http%3A%2F%2Fannounce.xxx-tracker.com%3A2710%2Fannounce")



//PROMISES

//MEGA PROMISE FUNCTIONs

//Promises que me dan info del sistema
function getFreeDiskSpace() {
  return new Promise((resolve, reject) => {
    checkDiskSpace(torrentDir).then((diskSpace) => {
      resolve(formatBytes(diskSpace.free));
    })
  })
}


function getMkvFiles() {
  return new Promise((resolve, reject) => {
    glob(torrentDir + '/**/*.+(mkv|avi)', {}, (err, files)=>{
      resolve(files)
    })
  })
}

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

function getTorrents(){
  let torrentSummary = []
  client.torrents.forEach( function (element){
    torrentObject = {
      name : element.name,
      infoHash : element.infoHash,
      done : element.done,
      progress : element.progress*100,
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

//Promise que me devuelve el resultado del promise.all de las infos del sistema
// formateado en un objecto chachi a mi gusto

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

//FUNCTIONS




function createTorrentDir(){
  fs.mkdtemp(path.join(os.tmpdir(), 'foo-'), (err, folder) => {
    if (err) throw err;
    console.log('Torrent destination folder: '+folder);
    torrentDir = folder
    //addTorrent(exampleMagnetURI)
  });


} 
  


function addTorrent(magnetURI){
  try{
    parseTorrent(magnetURI)


    client.add(magnetURI, { path: torrentDir }, function (torrent) {
      torrent.on('done', function () {
        console.log('torrent download finished')
        })

        torrent.on('error', (err) => {
          console.log(err)
        })
      })
    }
 
  catch (e){console.log(e)}
}
  
      

    
  
  


function formatBytes(a,b){if(0==a)return"0 Bytes";var c=1024,d=b||2,e=["Bytes","KB","MB","GB","TB","PB","EB","ZB","YB"],f=Math.floor(Math.log(a)/Math.log(c));return parseFloat((a/Math.pow(c,f)).toFixed(d))+" "+e[f]}


 
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


function makeLinks(torrentsInfo){
  let filesObj = []
  let fileObj = {}
  torrentsInfo.forEach((torrent)=>{
    torrent.files.forEach((file,index)=>{
      if (isVideo(path.basename(file))){
        fileObj = 
          { name: path.basename(file),
            url: HOSTNAME+'/api/'+torrent.infoHash+'/'+index+'/file'+path.extname(file)
          }
          filesObj.push(fileObj)
      }
      
      
    })
    
  })
  return filesObj

}


