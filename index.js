const dotenv = require('dotenv').config();
const express = require('express');
const app = express();
const crypto = require('crypto');
const cookie = require('cookie');
const nonce = require('nonce')();
const querystring = require('querystring');
const request = require('request-promise');
var shopifyAPI = require('shopify-node-api');


const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const scopes = 'read_products,write_products';
const forwardingAddress = "http://8bfc3ec3.ngrok.io"; // Replace this with your HTTPS Forwarding address

app.get('/', (req, res) => {
  res.send('Hello World!');
});


var Shopify;

app.get('/shopify', (req, res) => {
    const shop = req.query.shop;
    if (shop) {
      const state = nonce();
      const redirectUri = forwardingAddress + '/shopify/callback';
      const installUrl = 'https://' + shop +
        '/admin/oauth/authorize?client_id=' + apiKey +
        '&scope=' + scopes +
        '&state=' + state +
        '&redirect_uri=' + redirectUri;
  
      res.cookie('state', state);
      res.redirect(installUrl);
    } else {
      return res.status(400).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request');
    }
  });


  app.get('/shopify/callback', (req, res) => {
    const { shop, hmac, code, state } = req.query;
    const stateCookie = cookie.parse(req.headers.cookie).state;
   console.log(state)
    if (state !== stateCookie) {
      return res.status(403).send('Request origin cannot be verified');
    }
  
    if (shop && hmac && code) {
      // DONE: Validate request is from Shopify
      const map = Object.assign({}, req.query);
      delete map['signature'];
      delete map['hmac'];
      const message = querystring.stringify(map);
      const providedHmac = Buffer.from(hmac, 'utf-8');
      const generatedHash = Buffer.from(
        crypto
          .createHmac('sha256', apiSecret)
          .update(message)
          .digest('hex'),
          'utf-8'
        );
      let hashEquals = false;
  
      try {
        hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac)
      } catch (e) {
        hashEquals = false;
      };
  
      if (!hashEquals) {
        return res.status(400).send('HMAC validation failed');
      }
  
      const accessTokenRequestUrl = 'https://' + shop + '/admin/oauth/access_token';
const accessTokenPayload = {
  client_id: apiKey,
  client_secret: apiSecret,
  code,
};

request.post(accessTokenRequestUrl, { json: accessTokenPayload })
.then((accessTokenResponse) => {
  var accessToken = accessTokenResponse.access_token;
  res.status(200)
 
  res.redirect('http://localhost:8000/finish_auth');
  app.get('/finish_auth', function(req, res){
    console.log("hello")
    console.log(accessToken+"toek n")
    Shopify = new shopifyAPI({
        shop: 'demo-Store-react.myshopify.com', // MYSHOP.myshopify.com
        shopify_api_key: process.env.SHOPIFY_API_KEY, // Your API key
        shopify_shared_secret: process.env.SHOPIFY_API_SECRET, // Your Shared Secret
        access_token: accessToken, //permanent token
      });
      res.redirect('http://localhost:8000/products');
});
app.get('/products', function(req, res){
    var post_data = {
        "product": {
          "title": "Burton Custom Freestlye 151",
          "body_html": "<strong>Good snowboard!</strong>",
          "vendor": "Burton",
          "product_type": "Snowboard",
          "variants": [
            {
              "option1": "First",
              "price": "10.00",
              "sku": 123
            },
            {
              "option1": "Second",
              "price": "20.00",
              "sku": "123"
            }
          ]
        }
      }

    //   Shopify.post('/admin/products.json', post_data, function(err, data, headers){
    //     console.log(data);
    //     res.send(data)
    //   });
       
      Shopify.get('/admin/products.json', function(err, data, headers){
        res.status(200).json(data)
      });
      
    // Shopify.delete('/admin/products/3772117352501.json', function(err, data, headers){
    //     console.log(data);
    //   });

    // var put_data = {
    //     "product": {
    //         "vendor": "demo-Store-react"
    //     }
    //   }
       
    //   Shopify.put('/admin/products/3772147564597.json', put_data, function(err, data, headers){
    //     console.log(data);
    //     res.send(data)
    //   });
    // Shopify.get('/admin/products.json', function(err, data, headers){
    //     res.status(200).json(data)
    //   });
 })
})
.catch((error) => {
  res.status(error.statusCode).send(error.error.error_description);
});
    } else {
      res.status(400).send('Required parameters missing');
    }
  });

 
  app.on('listening',function(){
    console.log('ok, server is running');
});

app.listen(8000, () => {
  console.log('Example app listening on port 8000!');
});