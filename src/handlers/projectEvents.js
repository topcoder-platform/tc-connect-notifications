/*
 * Copyright (c) 2016 TopCoder, Inc. All rights reserved.
 */

/**
 * Define all event handlers
 * @author TCSCODER
 * @version 1.0
 */
const config = require('config');
const _ = require('lodash');
const constants = require('../common/constants');
const util = require('./util');

/**
 * Create notifications from project.draft-created event
 * @param {Object} project the event data
 * @return {Array} the array of notifications
 */
function projectDraftCreated(logger, project) {
  logger.debug('EVNT');
  const owner = _.find(project.members, { role: constants.memberRoles.customer, isPrimary: true });
  if (!owner) {
    return {};
  }

  const topic = constants.notifications.discourse.project.created;
  const topicData = {
    projectId: project.id,
    projectName: project.name,
    projectUrl: `https://connect.${config.get('AUTH_DOMAIN')}/projects/${project.id}/`,
  };

  // return notificaiton object with discourse data
  return {
    discourse: [{
      title: topic.title,
      content: topic.content(topicData),
    }],
  };
}

/**
 * Create notifications from project.updated event
 * @param {Object} logger child logger for this event handler
 * @param {String} data the event data
 * @returns {Object} the object of notifications
 */
function projectUpdated(logger, data) {
  const notifications = {
    discourse: [],
    slack: {
      manager: [],
      copilot: [],
    },
  };
  if (data.updated.status === data.original.status) {
    // project status has not transitioned
    return notifications;
  }

  const project = data.updated;
  let topic;
  if (project.status === constants.projectStatuses.inReview) {
    // create post notifying team members project was submitted for review
    topic = constants.notifications.discourse.project.submittedForReview;
    // Send manager notifications to slack
    notifications.slack.manager.push(util.buildSlackNotification(project));
  } else if (project.status === constants.projectStatuses.reviewed) {
    // Notify to all copilots if there's no copilot is assigned
    if (!_.some(project.members, ['role', 'copilot'])) {
      // Send copilot notifications to slack
      notifications.slack.copilot.push(util.buildSlackNotification(project));

      // also queue up a message to process later
      notifications.delayed = data;
    }
  } else if (project.status === constants.projectStatuses.active) {
    topic = constants.notifications.discourse.project.activated;
  } else if (project.status === constants.projectStatuses.canceled) {
    topic = constants.notifications.discourse.project.canceled;
  } else if (project.status === constants.projectStatuses.completed) {
    topic = constants.notifications.discourse.project.completed;
  }

  // post to discourse if topic is set
  if (topic) {
    const topicData = {
      projectName: project.name,
      projectUrl: `https://connect.${config.get('AUTH_DOMAIN')}/projects/${project.id}/`,
    };
    notifications.discourse.push({
      projectId: project.id,
      title: topic.title,
      content: topic.content(topicData),
    });
  }

  return notifications;
}

/**
 * FIXME Send slack notificatin if project.claim.reminder event
 * @param {String} msg the event data
 * @returns {Object} notifications object of notifications
 */
function* projectUnclaimedNotifications(logger, data) {
  const project = yield util.getProjectById(data.updated.id);
  const projectCopilotIds = util.getProjectMemberIdsByRole(project, constants.memberRoles.copilot);
  const notifications = {
    copilot: [],
  };
  if (projectCopilotIds.length === 0) {
    notifications.delayed = data;
    notifications.copilot.push(util.buildSlackNotification(project));
  }
  return notifications;
}


module.exports = {
  projectDraftCreated,
  projectUpdated,
  projectUnclaimedNotifications,
};
