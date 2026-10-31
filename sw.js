/* sw.js: membuat halaman bisa dibuka tanpa internet */
var CACHE="speakup-v1";
var CORE=["./","index.html"];

self.addEventListener("install",function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(CORE)}).then(function(){return self.skipWaiting()}));
});
self.addEventListener("activate",function(e){
  e.waitUntil(self.clients.claim());
});
self.addEventListener("fetch",function(e){
  var req=e.request;
  if(req.method!=="GET")return;
  var url=new URL(req.url);
  if(url.origin!==location.origin)return;
  e.respondWith(handle(req,url));
});

async function handle(req,url){
  var cache=await caches.open(CACHE);
  if(/\.mp4$/i.test(url.pathname)){
    var hit=await cache.match(url.pathname.split("/").pop(),{ignoreSearch:true});
    if(!hit)return fetch(req);
    return rangeResponse(req,hit);
  }
  try{
    var net=await fetch(req);
    if(net&&net.ok)cache.put(req,net.clone());
    return net;
  }catch(err){
    var c=await cache.match(req,{ignoreSearch:true});
    if(c)return c;
    if(req.mode==="navigate"){var idx=await cache.match("index.html");if(idx)return idx}
    return new Response("Offline",{status:503});
  }
}

/* pemutar video meminta potongan file (Range); layani dari cache */
async function rangeResponse(req,res){
  var buf=await res.arrayBuffer();
  var size=buf.byteLength;
  var h=req.headers.get("range");
  if(!h)return new Response(buf,{status:200,headers:{"Content-Type":"video/mp4","Content-Length":size,"Accept-Ranges":"bytes"}});
  var m=/bytes=(\d*)-(\d*)/.exec(h);
  var start=m[1]?parseInt(m[1],10):0;
  var end=m[2]?parseInt(m[2],10):size-1;
  if(end>=size)end=size-1;
  return new Response(buf.slice(start,end+1),{status:206,headers:{
    "Content-Type":"video/mp4","Accept-Ranges":"bytes",
    "Content-Range":"bytes "+start+"-"+end+"/"+size,
    "Content-Length":end-start+1}});
}
