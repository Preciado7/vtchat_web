const express = require('express');
const path = require('path');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  //'/cometd-dev/genesys',
  '/genesys',
  createProxyMiddleware({
    target: 'https://gme.banorte.com:8443',
    //target: 'https://ssl.veritran.net',
    changeOrigin: true,
    secure: false,
    logLevel: 'debug',
    onProxyReq: (proxyReq, req, res) => {
      proxyReq.setHeader('User-Agent', 'Mozilla/5.0');
      proxyReq.setHeader('Origin', 'https://gme.banorte.com:8443');
      proxyReq.setHeader('Referer', 'https://gme.banorte.com:8443');
      /*proxyReq.setHeader('Origin', 'https://ssl.veritran.net');
      proxyReq.setHeader('Referer', 'https://ssl.veritran.net');*/
      proxyReq.setHeader('Content-Type', 'application/json');

      // 🔐 Copia tus cookies de Postman
      proxyReq.setHeader('Cookie', 
        'BAYEUX_BROWSER=1146t2o4cy7pnhl; BIGipServerpool_gms_8443_desa=373129231.64288.0000');
    }
  })
);

app.get('*', (req, res) =>
  res.sendFile(path.join(__dirname, 'public/index.html'))
);

const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log(`Servidor corriendo en http://localhost:${port}`)
);
