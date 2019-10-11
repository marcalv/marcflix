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


//Here we are configuring express to use body-parser as middle-ware.
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//Handlebars middleware
app.engine('handlebars', exphbs({defaultLayout:'main'}));
app.set('view engine', 'handlebars');

//Torrent
var torrentDir = ''
createTorrentDir()
//torrentDir = path.join(__dirname,'torrents')

var WebTorrent = require('webtorrent')
var client = new WebTorrent()
var exampleMagnetURI = "magnet:?xt=urn:btih:f59f3e4b2eb8be6e96148667ebbcc53343a13dc3&dn=The.Simpsons.S31E02.1080p.WEB.x264-TBS[rarbg]&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Feddie4.nl%3A6969&tr=udp%3A%2F%2Ftracker.pirateparty.gr%3A6969&tr=udp%3A%2F%2Fopentrackr.org%3A1337&tr=udp%3A%2F%2Ftracker.zer0day.to%3A1337"




//Homepage route
app.get('/', (req,res) => {
    console.log("Get at /")
    console.log(client.torrents.length)

    Promise.all([getInfo()]).then(values => { 
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(values[0], null, 3));
    });   
})     

//Homepage route
app.get('/rss', (req,res) => {
  console.log("Get at /rss")
  console.log(client.torrents.length)
  Promise.all([getInfo()]).then(values => { 
    //res.setHeader('Content-Type', 'application/json');
    //res.end(JSON.stringify(values[0], null, 3));
    //console.log(values[0])
    res.set('Content-Type', 'text/xml');
    res.end(getRSS(values[0]));
  });  

  //res.set('Content-Type', 'text/xml');
  //res.end(getRSS());
})    



//Download file route
app.get('/view/:infoHash/:fileNum/:filename', function(req, res){
  let infoHash = req.params.infoHash
  let fileNum = req.params.fileNum
  let torrentObj = client.get(infoHash)
  let mypath = path.join(torrentObj.path,torrentObj.files[fileNum].path)
  console.log(path.join(__dirname,'index.js'))
  res.sendFile(mypath)
  
 }); 

 app.get('/ui', function (req, res) {
  res.sendFile(path.join(__dirname,'index.html'))
});

//Add Torrent route
app.post('/add', (req,res) => {
  console.log("Post at /add, magnet: "+req.body.magnet)
  var magnetURI = req.body.magnet
  addTorrent(magnetURI)
  //response
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ response: 'ok' }, null, 3));
})

//Download
app.post('/donwload/', (req,res) => {
  console.log("Post at /add, magnet: "+req.body.magnet)
  var magnetURI = req.body.magnet
  addTorrent(magnetURI)
  //response
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ response: 'ok' }, null, 3));
})

//Set static folder
app.use(express.static(path.join(__dirname,'public'))) 


//INICIO
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => console.log(`server started on port ${PORT}`));

const HOSTNAME = process.env.HOSTNAME || 'http://localhost:8000';

console.log("======================================")
//addTorrent(exampleMagnetURI)
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
      infoObj.freeSpaceDisk = values[0]
      infoObj.torrentsInfo = getTorrents()
      infoObj.files = values[1]
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
  try {
    client.add(magnetURI, { path: torrentDir }, function (torrent) {
      torrent.on('done', function () {
        console.log('torrent download finished')
        })
  
      console.log("Added Torrent: "+torrent.name)
  
    }) 
  }
  catch (e) {
    console.log("entering catch block");
    console.log(e);
    console.log("leaving catch block"); ç
  }
  
} 


function formatBytes(a,b){if(0==a)return"0 Bytes";var c=1024,d=b||2,e=["Bytes","KB","MB","GB","TB","PB","EB","ZB","YB"],f=Math.floor(Math.log(a)/Math.log(c));return parseFloat((a/Math.pow(c,f)).toFixed(d))+" "+e[f]}


 
function getRSS(infoObj) {
  console.log(infoObj)
  /* lets create an rss feed */
  var feed = new RSS({
      title: 'title',
      description: 'description',
      feed_url: 'http://example.com/rss.xml',
      site_url: 'http://example.com'})
   
  /* loop over data and add to feed */
    infoObj.torrentsInfo.forEach((torrent)=>{
      torrent.files.forEach((file,index)=>{
        feed.item({
          title:  path.basename(file),
          description: 'use this for the content. It can include html.',
          url: HOSTNAME+'/view/'+torrent.infoHash+'/'+index+'/file'+path.extname(file), // link to the item
        });
      })
    })
  

    feed.item({
      title:  'item title',
      description: 'use this for the content. It can include html.',
      url: 'http://techslides.com/demos/sample-videos/small.mp4', // link to the item
  });
  
// cache the xml to send to clients
return feed.xml();
}
