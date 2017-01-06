const http = require('http');
const https = require('https');
const redis = require('redis');
const config = require('config');
const redisClient = redis.createClient();

const protocolsObjects ={
  http: http,
  https: https
};

const routes = config.get('routes');
const routesArray = Object.keys(routes);


const isValidPath =(req, res)=>{
  for(let x=0; x<routesArray.length; x++){
    if(req.url.indexOf(routesArray[x])>-1) {
      req.route = routesArray[x];
      req.destination = routes[routesArray[x]];
      return proxyRequest(req, res);
    }
  }
  return rejectRequest(req, res);
}

const proxyRequest = (req, res)=>{

  let port = 80;
  let host = 'localhost';
  let route = req.route;
  let destination = req.destination;
  let protocol = destination.split('://')[0];
  let parts = destination.replace(protocol+'://', '').split(':');

  if(parts[0]) host = parts[0].replace('/','');
  if(parts[1]) port = parseInt(parts[1]);

  req.headers.host = destination.replace(protocol+'://', '');
  let options ={
    protocol: protocol+':',
    host: host,
    port: port,
    method: req.method,
    path: req.url,
    headers: req.headers
  };

  let connReq = protocolsObjects[protocol].request(options, (response)=>{
    let body = '';
    response.setEncoding('utf8');
    response.on('data', (chunk) => {
      body+=chunk.toString();
    });

    response.on('end', () => {
      res.end(body);
    });
  });

  connReq.on('error', (e) => {
    res.end(e.message);
  });

  connReq.write('');
  connReq.end();

}

const isValidToken = (req, res)=>{
  redisClient.get(req.headers['access-token'], (err, data)=>{
    if(err || data==null) rejectRequest(req, res);
    else {
      isValidPath(req, res);
    }
  })
}


const rejectRequest =(req, res)=>{
  res.end('Access Denied');
}

const server = http.createServer((req, res)=>{
  if(req.headers['access-token']==undefined) rejectRequest(req, res);
  else isValidToken(req, res);
});

server.listen(process.env.PORT || 5000, ()=>{
  console.log('ready');
});
