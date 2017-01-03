/*
 * Copyright (c) 2016 TopCoder, Inc. All rights reserved.
 */

/**
 * Initialize and start application
 * @author TCSCODER
 * @version 1.0
 */
const config = require('config');
const _ = require('lodash');
const co = require('co');
const jackrabbit = require('jackrabbit');
const logger = require('./common/logger');
const constants = require('./common/constants');
const handlers = require('./src/handlers');

// Connect to the target RabbitMQ to send (produce) notifications
const targetExchange = jackrabbit(config.TARGET_RABBIT_URL)
  .topic(config.TARGET_RABBIT_EXCHANGE_NAME);
targetExchange.queue({
  name: config.TARGET_RABBIT_QUEUE_NAME,
  key: config.TARGET_RABBIT_ROUTING_KEY,
});

/**
 * Handle events from the source RabbitMQ
 * @param {Object} data the message data
 * @param {Function} ack the ack callback
 * @param {Function} nack the nack callback
 * @param {Object} message the message
 */
function handleEvent(data, ack, nack, message) {
  const eventType = message.fields.routingKey;
  const correlationId = message.properties.correlationId;

  logger.info(`Receiving event with correlationId = '${correlationId}', type = '${eventType}'`);
  logger.debug(`Message: ${JSON.stringify(message)}`);

  co(function* generateNotifications() {
    switch (eventType) {
      case constants.events.projectDraftCreated:
        return handlers.projectDraftCreatedEventToNotifications(data);
      case constants.events.projectUpdated:
        return handlers.projectUpdatedEventToNotifications(data);
      case constants.events.projectMemberAdded:
        return yield handlers.projectMemberAddedEventToNotifications(data);
      case constants.events.projectMemberRemoved:
        return yield handlers.projectMemberRemovedEventToNotifications(data);
      case constants.events.projectMemberUpdated:
        return yield handlers.projectMemberUpdatedEventToNotifications(data);
      default:
        return [];
    }
  }).then((notifications) => {
    _.each(notifications, (notification) => {
      targetExchange.publish(notification, { key: config.TARGET_RABBIT_ROUTING_KEY });
    });

    ack();

    logger.info(`Complete handling event with correlationId = '${correlationId}', type = ` +
      `'${eventType}': ${notifications.length} notifications sent.`);
  }).catch((err) => {
    nack();

    logger.info(`Could not handle event with correlationId = '${correlationId}', type = ` +
      `'${eventType}'`, { err });
  });
}

// Connect to the source RabbitMQ to receive (consume) events
jackrabbit(config.SOURCE_RABBIT_URL)
  .topic(config.SOURCE_RABBIT_EXCHANGE_NAME)
  .queue({ name: config.SOURCE_RABBIT_QUEUE_NAME, keys: _.values(constants.events) })
  .consume(handleEvent);

logger.info('tc-connect-notifications started...');
