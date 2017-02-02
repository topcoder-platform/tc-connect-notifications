/*
 * Copyright (c) 2016 TopCoder, Inc. All rights reserved.
 */

/**
 * Initialize and start application
 * @author TCSCODER
 * @version 1.0
 */
const config = require('config');
const logger = require('./common/logger');
const constants = require('./common/constants');


// Connect to the source RabbitMQ to receive (consume) events
const service = require('./rabbitmq')(logger);
const delayService = require('./rabbitmq')(logger);

const connectNotificationsqueueOptions = {
  url: config.get('RABBITMQ.URL'),
  exchangeName: config.get('RABBITMQ.NOTIFICATIONS_EXCHANGE_NAME'),
  queues: []
};

const delayQueueOptions = {
  url: config.get('RABBITMQ.URL'),
  exchangeName: config.get('RABBITMQ.DELAYED_NOTIFICATIONS_EXCHANGE_NAME'),
  exchangeType: 'x-delayed-message',
  exchangeOptions: {
    autoDelete: false,
    durable: true,
    passive: true,
    arguments: { 'x-delayed-type': 'direct' } },
  queues: [{
    name: config.get('RABBITMQ.CONNECT_NOTIFICATIONS_QUEUE_NAME'),
    key: constants.events.projectUnclaimed,
  }],
};

delayService.initPublisher(delayQueueOptions)
.then(() => {
  service.initPublisher(connectNotificationsqueueOptions);
})
.then(() => {
  service.subscribe(
    config.get('RABBITMQ.URL'),
    config.get('RABBITMQ.PROJECTS_EXCHANGE_NAME'),
    config.get('RABBITMQ.CONNECT_NOTIFICATIONS_QUEUE_NAME'));
}).then(() => {
  logger.info('tc-connect-notifications started...');
});
