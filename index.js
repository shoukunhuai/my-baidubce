require('dotenv').config()

const http = require('http')
const axios = require('axios')
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const Auth = require('@baiducloud/sdk').Auth

const auth = new Auth(process.env.BCE_AK, process.env.BCE_SK)

// BCE host
const bceAxios = axios.create({
    httpAgent: new http.Agent({
        keepAlive: true,
        maxSockets: 200
    }),
    maxSockets: 200
})



// Express
function createApp() {
    let app = express();
    // application level middleware
    if (process.env.NODE_ENV === 'development') {
        app.use(cors({
            origin: true,
            credentials: true
        }))
    }
    app.disable('x-powered-by');
    app.use(bodyParser.json({
        limit: '200kb'
    }))
    app.use(bodyParser.urlencoded({
        parameterLimit: 100,
        extended: true
    }))

    return app
}


// sign request which will be forwarded to 
function sign(req, resp, next) {
    const { url, method = 'GET', params = {}, headers = {} } = req.body

    headers['x-bce-date'] = new Date().toISOString()
    const signature = auth.generateAuthorization(method, url, params, headers, undefined, undefined, ['Host'])

    headers['Authorization'] = signature
    req.body.headers = headers

    next()
}


const bce = createApp()

const router = new express.Router()

router.use(sign)

router.post('/', async (req, resp) => {
    // forward requests
    const { method = 'GET', url, params = {}, headers } = req.body
    let r
    console.log('%s %s HTTP/1.1', method, url)
    console.log('Host: %s', headers['Host'])
    console.log('Authorization: %s', headers['Authorization'])

    try {
        r = await bceAxios.request({
            url: `http://${headers['Host'] || headers['host']}${url}`,
            method,
            params,
            headers
        })
    } catch (e) {
        console.log('error: %s', e)
        resp.status(500).end()
        return
    }


    resp.json(r.data)
})


bce.use(router)


bce.listen(8080)