/*
 * Copyright (C) 2016 TopCoder Inc., All Rights Reserved.
 */

/**
 * The default configuration file
 * @author TCSCODER
 * @version 1.0
 */


module.exports = {
  AUTH_DOMAIN: 'topcoder.com',
  LOG_LEVEL: 'info',
  // Source RabbitMQ that provides events to tc-connect-notifications

  RABBITMQ_URL: 'amqp://127.0.0.1:5672',
  SOURCE_RABBIT_URL: 'amqp://127.0.0.1:5672',
  SOURCE_RABBIT_EXCHANGE_NAME: 'projects',
  SOURCE_RABBIT_QUEUE_NAME: 'events-queue',

  // Target RabbitMQ that receive notifications from tc-connect-notifications
  TARGET_RABBIT_URL: 'amqp://127.0.0.1:5672',
  TARGET_RABBIT_EXCHANGE_NAME: 'notifications',
  TARGET_RABBIT_ROUTING_KEY: 'discourse',
  TARGET_RABBIT_QUEUE_NAME: 'notifications-queue',
  COPILOT_TARGET_RABBIT_QUEUE_NAME: 'copilot-notifications-queue',
  COPILOT_TARGET_RABBIT_ROUTING_KEY: 'copilot-slack',
  MANAGER_TARGET_RABBIT_QUEUE_NAME: 'manager-notifications-queue',
  MANAGER_TARGET_RABBIT_ROUTING_KEY: 'manager-slack',
  DELAY_RABBIT_EXCHANGE_NAME: 'delay-notifications',
  // currently 50 secs for testing
  UNCLAIMED_PROJECT_REPOST_DELAY: 50000,
  // Token is generated from https://logentries.com/
  CAPTURE_LOGS: false,
  LOGENTRIES_TOKEN: '',
  // The base url to the project/user API server
  API_BASE_URL: 'http://127.0.0.1:3001',
  // The manager group
  ALL_MANAGER_USER_IDS: [11111111, 22222222],
  // The copilot group
  ALL_COPILOT_USER_IDS: [11111111, 33333333],
  // Disable delay exchange and use direct instead ( delete existing delay exchnge after changing)
  DISABLE_DELAY_EXCHANGE: false,
  SLACK_ICON_URL: 'https://emoji.slack-edge.com/T03R80JP7/topcoder/7c68acd90a6b6d77.png',
  SLACK_USERNAME: 'webhookbot',
};
