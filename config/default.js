/*
 * Copyright (C) 2016 TopCoder Inc., All Rights Reserved.
 */

/**
 * The default configuration file
 * @author TCSCODER
 * @version 1.0
 */


module.exports = {
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  // Source RabbitMQ that provides events to tc-connect-notifications
  SOURCE_RABBIT_URL: process.env.SOURCE_RABBIT_URL || 'amqp://127.0.0.1:5672',
  SOURCE_RABBIT_EXCHANGE_NAME: process.env.SOURCE_RABBIT_EXCHANGE_NAME || 'projects',
  SOURCE_RABBIT_QUEUE_NAME: process.env.SOURCE_RABBIT_QUEUE_NAME || 'events-queue',
  // Target RabbitMQ that receive notifications from tc-connect-notifications
  TARGET_RABBIT_URL: process.env.TARGET_RABBIT_URL || 'amqp://127.0.0.1:5672',
  TARGET_RABBIT_EXCHANGE_NAME: process.env.TARGET_RABBIT_EXCHANGE_NAME || 'notifications',
  TARGET_RABBIT_ROUTING_KEY: process.env.TARGET_RABBIT_ROUTING_KEY || 'discourse',
  TARGET_RABBIT_QUEUE_NAME: process.env.TARGET_RABBIT_QUEUE_NAME || 'notifications-queue',
  COPILOT_TARGET_RABBIT_QUEUE_NAME: process.env.COPILOT_TARGET_RABBIT_QUEUE_NAME || 'copilot-notifications-queue',
  COPILOT_TARGET_RABBIT_ROUTING_KEY: process.env.COPILOT_TARGET_RABBIT_ROUTING_KEY || 'copilot-slack',
  MANAGER_TARGET_RABBIT_QUEUE_NAME: process.env.MANAGER_SOURCE_RABBIT_QUEUE_NAME || 'manager-notifications-queue',
  MANAGER_TARGET_RABBIT_ROUTING_KEY: process.env.MANAGER_TARGET_RABBIT_ROUTING_KEY || 'manager-slack',
  DELAY_RABBIT_EXCHANGE_NAME: process.env.DELAY_RABBIT_EXCHANGE_NAME || 'delay-notifications',
  // currently 50 secs for testing
  UNCLAIMED_PROJECT_REPOST_DELAY: process.env.UNCLAIMED_PROJECT_REPOST_DELAY || 50000,
  // Token is generated from https://logentries.com/
  LOGENTRIES_TOKEN: process.env.LOG_ENTRIES_TOKEN || '29dc910d-e899-45ac-9b4d-5bf53f446e71',
  // The base url to the project/user API server
  API_BASE_URL: process.env.API_BASE_URL || 'http://127.0.0.1:3001',
  // The manager group
  ALL_MANAGER_USER_IDS: process.env.ALL_MANAGER_USER_IDS || [11111111, 22222222],
  // The copilot group
  ALL_COPILOT_USER_IDS: process.env.ALL_COPILOT_USER_IDS || [11111111, 33333333],
  // Disable delay exchange and use direct instead ( delete existing delay exchnge after changing)
  DISABLE_DELAY_EXCHANGE: process.env.DISABLE_DELAY_EXCHANGE || false,
  SLACK_ICON_URL: process.env.SLACK_ICON_URL || 'https://emoji.slack-edge.com/T03R80JP7/topcoder/7c68acd90a6b6d77.png',
  SLACK_USERNAME: process.env.SLACK_USERNAME || 'webhookbot',
};
