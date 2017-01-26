/*
 * Copyright (c) 2016 TopCoder, Inc. All rights reserved.
 */

/**
 * Define all event handlers
 * @author TCSCODER
 * @version 1.0
 */
const co = require('co');
const _ = require('lodash');
const config = require('config');
const projectEvents = require('./projectEvents');
const memberEvents = require('./memberEvents');
const constants = require('../common/constants');
const util = require('./util');

/**
 * Handle events from the source RabbitMQ
 * @param {Object} data the message data
 * @param {Function} ack the ack callback
 * @param {Function} nack the nack callback
 * @param {Object} message the message
 */
module.exports = (logger, message, channel, publish) => {
  const eventType = message.fields.routingKey;
  const correlationId = message.properties.correlationId;
  // create a child logger so we can trace with original request id
  const childLogger = logger.child({
    requestId: correlationId,
  });
  const data = JSON.parse(message.content.toString());
  childLogger.info(`Receiving event with type = '${eventType}'`);
  childLogger.debug('Payload:', data);

  co(function* generateNotifications() {
    logger.debug(eventType, constants.events.projectDraftCreated);
    switch (eventType) {
      case constants.events.projectDraftCreated:
        return yield projectEvents.projectDraftCreated(childLogger, data);
      case constants.events.projectUpdated:
        return yield projectEvents.projectUpdated(childLogger, data);
      case constants.events.projectUnclaimed:
        return yield projectEvents.projectUnclaimedNotifications(childLogger, data);
      case constants.events.projectMemberAdded:
        return yield memberEvents.memberAdded(childLogger, data);
      case constants.events.projectMemberRemoved:
        return yield memberEvents.memberRemoved(childLogger, data);
      case constants.events.projectMemberUpdated:
        return yield memberEvents.memberUpdated(childLogger, data);
      default:
        return [];
    }
  }).then((notifications) => {
    logger.debug('Notifications: ', notifications)
    _.each(notifications.discourse, (n) => {
      const { projectId, title, content } = n;
      util.createProjectDiscourseNotification(childLogger, projectId, title, content);
    });
    const publishPromises = [];
    if (notifications.slack) {
      // publish with manager slack key
      _.each(notifications.slack.manager, (n) => {
        publishPromises.push(publish(config.get('MANAGER_TARGET_RABBIT_ROUTING_KEY'), n));
      });
      // publish with copilot slack key
      _.each(notifications.slack.copilot, (n) => {
        publishPromises.push(publish(config.get('COPILOT_TARGET_RABBIT_ROUTING_KEY'), n));
      });
    }

    if (notifications.delayed) {
      publishPromises.push(publish(config.get('TARGET_RABBIT_DELAY_ROUTING_KEY'), notifications.delayed));
    }
    return Promise.all(publishPromises);
  }).then(() => {
    childLogger.info('Succesfully handled event, ACKing... ');
    return channel.ack(message);
  }).catch((err) => {
    childLogger.error(err);
    return channel.nack(message, false, false);
  });
};
