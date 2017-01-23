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

// Connect to the target RabbitMQ to send (produce) notifications
const targetExchange = jackrabbit(config.TARGET_RABBIT_URL)
  .topic(config.TARGET_RABBIT_EXCHANGE_NAME, {
    durable: true,
  });
targetExchange.queue({
  name: config.TARGET_RABBIT_QUEUE_NAME,
  key: config.TARGET_RABBIT_ROUTING_KEY,
});
targetExchange.queue({
  name: config.MANAGER_TARGET_RABBIT_QUEUE_NAME,
  key: config.MANAGER_TARGET_RABBIT_ROUTING_KEY,
});
targetExchange.queue({
  name: config.COPILOT_TARGET_RABBIT_QUEUE_NAME,
  key: config.COPILOT_TARGET_RABBIT_ROUTING_KEY,
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

  logger.info(`Receiving event with type = '${eventType}'`);
  if (correlationId) {
    logger.info(`correlationId = '${correlationId}'`);
  }
  logger.debug(`Message: ${JSON.stringify(message)}`);

  co(function* generateNotifications() {
    switch (eventType) {
      case constants.events.projectDraftCreated:
        return handlers.projectDraftCreatedEventToNotifications(data);
      case constants.events.projectUpdated:
        return handlers.projectUpdatedEventToNotifications(data);
      case constants.events.projectUnclaimed:
        return yield handlers.projectUnclaimedNotifications(data);
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
    let notificationsLen;
    if (eventType === constants.events.projectUpdated) {
      const discourseNotifications = notifications.discourse;
      const managerNotifications = notifications.slack.manager;
      const copilotNotifications = notifications.slack.copilot;
      _.each(discourseNotifications, (notification) => {
        targetExchange.publish(notification, { key: config.TARGET_RABBIT_ROUTING_KEY });
      });

      _.each(managerNotifications, (notification) => {
        targetExchange.publish(notification, { key: config.MANAGER_TARGET_RABBIT_ROUTING_KEY });
      });

      _.each(copilotNotifications, (notification) => {
        targetExchange.publish(notification, { key: config.COPILOT_TARGET_RABBIT_ROUTING_KEY });
      });

      if (notifications.delayed) {
        delayPublish(constants.events.projectUnclaimed,
          notifications.delayed, config.UNCLAIMED_PROJECT_REPOST_DELAY);
      }
      notificationsLen = discourseNotifications.length;
    } else if (eventType === constants.events.projectUnclaimed) {
      if (notifications.delayed) {
        delayPublish(constants.events.projectUnclaimed,
          notifications.delayed, config.UNCLAIMED_PROJECT_REPOST_DELAY);
      }
      _.each(notifications.copilot, (notification) => {
        targetExchange.publish(notification, { key: config.COPILOT_TARGET_RABBIT_ROUTING_KEY });
      });
      notificationsLen = notifications.copilot.length;
    } else {
      _.each(notifications, (notification) => {
        targetExchange.publish(notification, { key: config.TARGET_RABBIT_ROUTING_KEY });
      });
      notificationsLen = notifications.length;
    }

    ack();
    if (correlationId) {
      logger.info(`Complete handling event with correlationId = '${correlationId}', type = ` +
      `'${eventType}'
      : ${notificationsLen} notifications sent.`);
    } else {
      logger.info(`Complete handling event with type = '${eventType}'
      : ${notificationsLen} notifications sent.`);
    }
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
