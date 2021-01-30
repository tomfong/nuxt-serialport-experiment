require('dotenv').config();

const port = process.env.PORT || 3000
const isProd = process.env.NODE_ENV === 'production'
const http = require('http')
const app = require('express')()
const server = http.createServer(app)
const io = require('socket.io')(server)

const serialport = require("serialport");
const usbDetect = require("usb-detection");
const { Nuxt, Builder } = require('nuxt')
const config = require('./nuxt.config.js');
config.dev = !isProd;

const nuxt = new Nuxt(config)
if (config.dev) {
  const builder = new Builder(nuxt)
  builder.build()
}
app.use(nuxt.render)

server.listen(port, () => {
  console.log('Server listening on localhost:' + port)
});

usbDetect.startMonitoring();
usbDetect.on('add', function(device) { 
  console.log('add', device); 
  if (device.vendorId == process.env.VID_INT && device.productId == process.env.PID_INT) {
    if (!sp && !scannerConnected) {
      initPort('usbDetect');
    }
  }
});
usbDetect.on('remove', async function(device) { 
  console.log('remove', device); 
  if (device.vendorId == process.env.VID_INT && device.productId == process.env.PID_INT) {
    console.log( sp? (sp.isOpen? 'onRemove: sp is opened' : 'onRemove: sp exist but not opened') : 'onRemove: sp not exist');
  }
});

io.on('connection', socket => {
  console.log('io connection on for client => ' + socket.id);
  socket.on('check-scanner', () => {
    if (sp && sp.isOpen && scannerConnected) {
      socket.emit('scanner-connected', sp.path);
    } else {
      socket.emit('scanner-disconnected', null);
    }
  })
});

app.on('will-quit', () => {
  if (sp) {
    sp.close();
    console.log('port closed as app will quit')
  }
});

app.on('quit', () => {
  if (sp) {
    sp.close();
    console.log('port closed as app quit')
  }
});

const SerialPort = serialport;
var sp;
let scannerConnected = false;
initPort('initialization');

async function initPort(from) {
  console.log('initializing port... from ' + from)
  try {
    var port = await getPort();
    if (port) {
      console.log('found port = ' + port.path);
      var portName = port.path;
      sp = new SerialPort(portName, {
        parser: serialport.parsers.raw,
        autoOpen: false
      });
      sp.open(function (error) {
        if (error) {
          console.error('failed to open', error);
        }
      });
      sp.on('data', function(data) {
        console.log('data received: ' + String(data));
        io.emit('scanned-data', String(data));
      });
      sp.on('close', () => {
        console.log('port closed!')
        io.emit('scanner-disconnected', null);
        scannerConnected = false;
        reopenPort();
      });
      sp.on('open', () => {
        scannerConnected = true;
        console.log('port opened!')
        io.emit('scanner-connected', portName);
      })
    }
  } catch (e) {
    console.log('failed to open port', e);  
  }
}

function reopenPort() {
  if (sp) {
    sp.open( (err) => {
      if (!err)
        return;
      console.log('Port is not reopened');
      setTimeout(reopenPort, 1000); // next attempt to open after 10s
    });
  }
}

async function getPort() {
  const targetPort = await serialport.list().then(
    ports => {
      const port = ports.find( x => (x.vendorId == process.env.VID && x.productId == process.env.PID));
      return Promise.resolve(port);
    }
  );
  return targetPort;
}