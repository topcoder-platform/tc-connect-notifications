/*
 * Copyright (c) 2016 TopCoder, Inc. All rights reserved.
 */

/**
 * Define all event handlers
 * @author TCSCODER
 * @version 1.0
 */

const _ = require('lodash');
const Promise = require('bluebird');
const config = require('config');
const amqplib = require('amqplib');
const constants = require('./common/constants');
const handler = require('./handlers');

module.exports = (logger) => {
  let subConn;
  let pubConn;
  let exchangeName;
  let queues;
  let exchangeType;
  let exchangeOptions = {
    durable: true,
  };
  let pubChannel;
  /**
   * publishes a message to the target exchange
   * @type {Promise}
   */
  const publish = Promise.coroutine(function* (_exchangeName, key, payload, props = {}) {
    try {
      props.contentType = 'application/json';
      pubChannel.publish(_exchangeName, key, new Buffer(JSON.stringify(payload)), props);
    } catch (err) {
      logger.error(err);
    }
  });

  /**
   * Initializes code to subscribe to events
   * @type {promise}
   */
  const subscribe = Promise.coroutine(function* (url, exchangeName, queueName) {
    try {
      logger.info('Connecting to rabbitmq');
      subConn = yield amqplib.connect(url);
      const channel = yield subConn.createChannel();
      yield channel.assertExchange(exchangeName, 'topic', {
        durable: true,
      });
      logger.info(`Exchange ${exchangeName} created... `);
      const qok = yield channel.assertQueue(queueName);
      const subscriberQ = qok.queue;
      const bindings = _.values(constants.events);
      logger.info(`Queue ${queueName} created... `);
      logger.info('Adding bindings', bindings);
      const bindingPromises = _.map(bindings, (rk) => {
        return channel.bindQueue(subscriberQ, exchangeName, rk);
      });
      yield Promise.all(bindingPromises);
      yield channel.consume(subscriberQ, (msg) => {
        handler(logger, msg, channel, publish);
      });
      logger.info('Waiting for messages ... ');
    } catch (err) {
      logger.error(err);
      return Promise.reject(err);
    }
  });

  /**
   * Initializes a publisher connection
   * @type Promise
   */
  const initPublisher = Promise.coroutine(function* (options) {
    try {
      logger.info('Initializing publisher(s) ...');
      pubConn = yield amqplib.connect(options.url);
      exchangeName = options.exchangeName;
      exchangeType = options.exchangeType || 'topic';
      exchangeOptions = options.exchangeOptions || exchangeOptions;
      queues = options.queues;
      pubChannel = yield pubConn.createChannel();
      // make sure exchange is created
      yield pubChannel.assertExchange(exchangeName, exchangeType, exchangeOptions);
      _.each(queues, Promise.coroutine(function* (queue) {
        yield pubChannel.assertQueue(queue.name);
        yield pubChannel.bindQueue(queue.name, exchangeName, queue.key);
      }));
    } catch (err) {
      logger.error(err);
      return Promise.reject(err);
    }
  });

  return {
    initPublisher,
    publish,
    subscribe,
  };
};
