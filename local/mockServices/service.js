// server.js
var jsonServer = require('json-server')
var server = jsonServer.create()
var router = jsonServer.router('db.json')
var middlewares = jsonServer.defaults()
var _ = require('lodash')
server.use(middlewares)

server.use(jsonServer.rewriter({
  '/v3/': '/',
  '/v4/': '/',
}))
server.use(function(req, res, next) {
  if (req.method === 'POST' && req.url.toLowerCase().indexOf('authorizations') > -1) {
    res.json({
      "id": "1",
      "result": {
          "success": true,
          "status": 200,
          "metadata": null,
          "content": {
              "id": "477949215",
              "modifiedBy": null,
              "modifiedAt": null,
              "createdBy": null,
              "createdAt": null,
              "token": "token",
              "refreshToken": null,
              "target": "1",
              "externalToken": null,
              "zendeskJwt": null
          }
      },
      "version": "v3"
    })
  } else if (req.method == 'GET' && req.url.toLowerCase().indexOf('members/_search') > -1) {
      var userId = parseInt(req.query.query.split(':')[1])
      if (!userId) {
        return res.status(404).json()
      }
      var userDb = router.db.get('members').value()
      console.log(userDb)
      var data = _.find(userDb, (u) => {
        console.log(u.result.content.userId)
        return parseInt(u.result.content.userId) === userId
      })

      if (!data) {
        return res.status(404).json({})
      }
      return res.json({
        "id": "1",
        "result": {
          "success": true,
          "status": 200,
          "metadata": null,
          "content": [data.result.content]
        }
      })
  } else {
    next();
  }
})
server.use(router)
server.listen(3001, function () {
  console.log('JSON Server is running')
})
