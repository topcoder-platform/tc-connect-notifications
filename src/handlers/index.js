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
  const data = JSON.parse(message.content);
  childLogger.info(`Receiving event with type = '${eventType}'`);
  childLogger.debug('Payload:', JSON.stringify(data));

  co(function* generateNotifications() {
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
    const notifyPromises = [];
    if (notifications.slack) {
      // defaulting to topcoder slack account.
      // In the future, we can read custom slack integration urls per project.
      const webhookUrl = config.get('TC_SLACK_WEBHOOK_URL');
      if (!_.isEmpty(webhookUrl)) {
        const slackNotifications = _.union(notifications.slack.manager, notifications.slack.copilot);
        _.each(slackNotifications, (n) => {
          notifyPromises.push(util.sendSlackNotification(webhookUrl, n, logger));
        });
      }
    }

    if (notifications.delayed) {
      let ttl = message.properties.headers.ttl || config.get('RABBITMQ.DELAYED_NOTIFICATIONS_TTL');
      ttl -= 1;
      if (ttl) {
        notifyPromises.push(publish(
          config.get('RABBITMQ.DELAYED_NOTIFICATIONS_EXCHANGE_NAME'),
          constants.events.projectUnclaimed,
          notifications.delayed,
          {
            headers: {
              'x-delay': config.get('RABBITMQ.DELAY_DURATION'),
              ttl,
            },
          }));
      }
    }
    return Promise.all(notifyPromises);
  }).then(() => {
    childLogger.info('Succesfully handled event, ACKing... ');
    return channel.ack(message);
  }).catch((err) => {
    childLogger.error(err);
    return channel.nack(message, false, false);
  });
};
