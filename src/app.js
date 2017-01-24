/*
 * Copyright (c) 2016 TopCoder, Inc. All rights reserved.
 */

/**
 * Initialize and start application
 * @author TCSCODER
 * @version 1.0
 */
const config = require('config');
const jackrabbit = require('jackrabbit');
const logger = require('./common/logger');
const constants = require('./common/constants');

// Setup delay exchange
const rabbit = jackrabbit(config.SOURCE_RABBIT_URL);
let pubChannel;
let delayChannelReady = false;

/**
 * Setup RabbitMq exchange for delayed messages
 * @private
 */

function setupDelayExchange() {
  const connection = rabbit.getInternals().connection;
  connection.createConfirmChannel((err, ch) => {
    pubChannel = ch;

    pubChannel.on('close', () => {
      logger.info('Closing channel');
      delayChannelReady = false;
    });
    pubChannel.on('error', (error) => {
      if (error.code === 406) {
        logger.info('Existing Exchange is incompatiable please Delete it!', config.DELAY_RABBIT_EXCHANGE_NAME);
      }
    });

    const exchangeOptions = {
      autoDelete: false,
      durable: true,
      passive: true,
    };
    let exchangeType = 'direct';
    if (!config.DISABLE_DELAY_EXCHANGE) {
      exchangeOptions.arguments = { 'x-delayed-type': 'direct' };
      exchangeType = 'x-delayed-message';
    }
    pubChannel.assertExchange(config.DELAY_RABBIT_EXCHANGE_NAME, exchangeType, exchangeOptions);
    pubChannel.bindQueue(config.SOURCE_RABBIT_QUEUE_NAME,
      config.DELAY_RABBIT_EXCHANGE_NAME, constants.events.projectUnclaimed);
    rabbit.emit('ready');
    delayChannelReady = true;
  });
}

rabbit.once('connected', setupDelayExchange);

/**
 * Send delayed messages to queue
 * @param {string} routingKey key of queue
 * @param {object} content mseeage object
 * @param {number} delay of delay in milliseconds
 * @returns the notification
 * @private
 */

function delayPublish(routingKey, content, delay) {
  function sendMessage() {
    try {
      const msg = JSON.stringify(content);
      let options = {};
      if (!config.DISABLE_DELAY_EXCHANGE) {
        options = { headers: { 'x-delay': delay } };
      }
      pubChannel.publish(config.DELAY_RABBIT_EXCHANGE_NAME, routingKey, new Buffer(msg), options,
      (err) => {
        if (err) {
          pubChannel.connection.close();
        }
      });
    } catch (e) {
      logger.info('[AMQP] delay publish failed', e.message);
    }
  }
  if (delayChannelReady) sendMessage();
  else rabbit.once('ready', sendMessage);
}

// Connect to the source RabbitMQ to receive (consume) events
const service = require('./rabbitmq')(logger);

service.initPublisher(
  config.get('RABBITMQ_URL'),
  config.get('TARGET_RABBIT_EXCHANGE_NAME'))
.then(() => {
  service.subscribe(
    config.get('RABBITMQ_URL'),
    config.get('SOURCE_RABBIT_EXCHANGE_NAME'),
    config.get('SOURCE_RABBIT_QUEUE_NAME'));
}).then(() => {
  logger.info('tc-connect-notifications started...');
});
