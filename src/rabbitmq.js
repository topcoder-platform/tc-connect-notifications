/*
 * Copyright (c) 2016 TopCoder, Inc. All rights reserved.
 */

/**
 * Define all event handlers
 * @author TCSCODER
 * @version 1.0
 */

const _ = require('lodash')
const Promise = require('bluebird')
const config = require('config')
const amqplib = require('amqplib')
const constants = require('./common/constants')
const handler = require('./handlers')

module.exports = (logger) => {
  let _subConn = null
  let _pubConn = null


  /**
   * Initializes code to subscribe to events
   * @type {promise}
   */
  const subscribe = Promise.coroutine(function*(url, exchangeName, queueName, eventHandler) {
    try {
      logger.info('Connecting to rabbitmq')
      _subConn = yield amqplib.connect(url)
      const channel = yield _subConn.createChannel()
      yield channel.assertExchange(exchangeName, 'topic', {
        durable: true
      })
      logger.info(`Exchange ${exchangeName} created... `)
      const qok = yield channel.assertQueue(queueName)
      const subscriberQ = qok.queue
      const bindings = _.values(constants.events)
      logger.info(`Queue ${queueName} created... `)
      logger.info('Adding bindings', bindings)
      var bindingPromises = _.map(bindings, (rk) => {
        return channel.bindQueue(subscriberQ, exchangeName, rk)
      })
      yield Promise.all(bindingPromises)
      yield channel.consume(subscriberQ, (msg) => {
        handler(logger, msg, channel, publish)
      })
      logger.info('Waiting for messages ... ')
    } catch (err) {
      logger.error(err)
      return Promise.reject(err)
    }
  })

  /**
   * Initializes a publisher connection
   * @type Promise
   */
  const initPublisher = Promise.coroutine(function*(url, exchangeName) {
    try {
      logger.info('Initializing publisher(s) ...')
      _pubConn = yield amqplib.connect(url)
    } catch (err) {
      logger.error(err)
      return Promise.reject(err)
    }
  })

  /**
   * publishes a message to the target exchange
   * @type {Promise}
   */
  const publish = Promise.coroutine(function*(key, payload, props = {}) {
    try {
      props['content_type'] = 'application/json'
      const channel = yield _pubConn.createChannel()
      const exchangeName = config.get('TARGET_RABBIT_EXCHANGE_NAME')
      // make sure exchange is created
      yield channel.assertExchange(exchangeName, 'topic', {
        durable: true
      })
      channel.publish(exchangeName, key, new Buffer(JSON.stringify(payload)), props)
      channel.close()
    } catch (err) {
      logger.error(err)
    }
  })

  return {
    initPublisher,
    publish,
    subscribe
  }

}
