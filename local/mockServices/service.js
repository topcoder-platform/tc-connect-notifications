// server.js
var jsonServer = require('json-server')
var server = jsonServer.create()
var router = jsonServer.router('db.json')
var middlewares = jsonServer.defaults()
var _ = require('lodash')
server.use(middlewares)

const projectTypes = {
  app_dev: {
    label: 'Full App',
    color: '#96d957',
  },
  generic: {
    label: 'Work Project',
    color: '#b47dd6',
  },
  visual_prototype: {
    label: 'Design & Prototype',
    color: '#67c5ef',
  },
  visual_design: {
    label: 'Design',
    color: '#67c5ef',
  },
  app: {
    label: 'App',
    color: '#96d957',
  },
  quality_assurance: {
    label: 'QA',
    color: '#96d957',
  },
  chatbot: {
    label: 'Chatbot',
    color: '#96d957',
  },
  website: {
    label: 'Website',
    color: '#96d957',
  },
};

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
      var data = _.find(userDb, (u) => {
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
  } else if (req.method == 'GET' && req.url.indexOf('projectTypes') > -1) {
    var key = req.url.split('/').pop()
    return res.json({
      "id": "1",
      "version": "v4",
      "result": {
        "success": true,
        "status": 200,
        "content": {
          "key": key,
          "displayName": projectTypes[key].label,
          "icon": "http://example.com/icon1.ico",
          "question": "question 1",
          "info": "info 1",
          "aliases": ["key-1", "key_1"],
          "disabled": true,
          "hidden": true,
          "metadata": { "slack-notification-mappings": projectTypes[key] },
          "createdBy": 1,
          "updatedBy": 1,
        }
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
