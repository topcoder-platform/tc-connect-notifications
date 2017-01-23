/*
 * Copyright (c) 2016 TopCoder, Inc. All rights reserved.
 */

/**
 * This file defines constant values
 * @author TCSCODER
 * @version 1.0
 */
module.exports = {
  // The event types to be consumed from the source RabbitMQ
  events: {
    projectDraftCreated: 'project.draft-created',
    projectUpdated: 'project.updated',
    projectMemberAdded: 'project.member.added',
    projectMemberRemoved: 'project.member.removed',
    projectMemberUpdated: 'project.member.updated',
    projectUnclaimed: 'project.claim.reminder',
  },
  // The notification types to be produce to the target RabbitMQ
  notifications: {
    project: {
      created: { notificationType: 'Project.Created', subject: 'Created' },
      submittedForReview: { notificationType: 'Project.SubmittedForReview', subject: 'Submitted for review' },
      availableForReview: { notificationType: 'Project.AvailableForReview', subject: 'Available for review' },
      reviewed: { notificationType: 'Project.Reviewed', subject: 'Reviewed' },
      availableToClaim: { notificationType: 'Project.AvailableToClaim', subject: 'Reviewed - Available to claim' },
    },
    teamMember: {
      added: { notificationType: 'Project.Member.Added', subject: 'Member added' },
      managerJoined: { notificationType: 'Project.Member.ManagerJoined', subject: 'Manager joined' },
      copilotJoined: { notificationType: 'Project.Member.CopilotJoined', subject: 'Copilot joined' },
      removed: { notificationType: 'Project.Member.Removed', subject: 'Member removed' },
      left: { notificationType: 'Project.Member.Left', subject: 'Member left' },
      ownerChanged: { notificationType: 'Project.Member.OwnerChanged', subject: 'Ownership changed' },
    },
  },
  projectStatuses: {
    inReview: 'in_review',
    reviewed: 'reviewed',
  },
  memberRoles: {
    manager: 'manager',
    customer: 'customer',
    copilot: 'copilot',
  },
};
