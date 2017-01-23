# tc-connect-notifications

Connect Notifications biz layer

## Pre-requisites

- RabbitMQ
- Node.JS 6+

## Configuration

Update environment variables or `./config/default.js`:

- `LOG_LEVEL`: the log level (e.g. debug, info)
- `SOURCE_RABBIT_URL`: the event RabbitMQ's URL
- `SOURCE_RABBIT_EXCHANGE_NAME`: the event RabbitMQ's topic exchange name
- `SOURCE_RABBIT_QUEUE_NAME`: the event RabbitMQ's queue name
- `COPILOT_TARGET_RABBIT_QUEUE_NAME`: copilot slack queue
- `COPILOT_TARGET_RABBIT_ROUTING_KEY`: copilot slack queue routing key
- `MANAGER_TARGET_RABBIT_QUEUE_NAME`:  manager slack queue routing key
- `MANAGER_TARGET_RABBIT_ROUTING_KEY`: manager slack queue routing key
- `DELAY_RABBIT_EXCHANGE_NAME`: Exchange name used for delayed messages
- `UNCLAIMED_PROJECT_REPOST_DELAY`: Amount of delay before reposting unclaimed project
- `TARGET_RABBIT_URL`: the notification RabbitMQ's URL
- `TARGET_RABBIT_EXCHANGE_NAME`: the notification RabbitMQ's topic exchange name
- `TARGET_RABBIT_ROUTING_KEY`: the notification RabbitMQ's routing key
- `TARGET_RABBIT_QUEUE_NAME`: the notification RabbitMQ's queue name
- `LOGENTRIES_TOKEN`: the Logentries token generated from https://logentries.com/
- `API_BASE_URL`: the base url to the API server to get project/user info
- `ALL_MANAGER_USER_IDS`: the array of all managers' userIds
- `ALL_COPILOT_USER_IDS`: the array of all copilots' userIds
- `DISABLE_DELAY_EXCHANGE`: Disable exchage type delay and use 'direct' instead(Note: after changing this delete existing delay exchange )
- `SLACK_ICON_URL`: slack webhook icon url
- `SLACK_USERNAME`: slack webhook username

## Local Deployment

- Install dependencies:

  ```bash
  cd tc-connect-notifications
  npm i
  ```

- Start mock API server:

  ```bash
  npm i -g json-server
  cd local/mockServices
  json-server -p 3001 services.json
  ```

- Start the app:

  ```bash
  cd tc-connect-notifications
  node app
  ```

## Local Deployment (Docker)

- Install dependencies:

  ```bash
  cd tc-connect-notifications
  npm i
  ```

- Setup Docker Compose: https://docs.docker.com/compose/install/

- Start Docker Compose:

  ```bash
  cd local
  docker-compose up
  ```
- download rabbitmq_delayed_message_exchange plugin from http://www.rabbitmq.com/community-plugins.html in current folder

- Copy plugin to docker instance
  ```
  docker cp ./rabbitmq_delayed_message_exchange-0.0.1.ez local_rabbitmq_1:/plugins/
  ```
- Login into docker rabbitmq
  ```
  docker exec -it local_rabbitmq_1 bash
  ```
- enable plugin
  ```
  rabbitmq-plugins enable rabbitmq_delayed_message_exchange
  ```

## Verification

- Run lint

  ```bash
  npm run lint
  ```

- Run tests

  ```bash
  npm run test
  ```

- Generate coverage report

  ```bash
  npm run coverage
  ```
## Manual verification

- Start the app

- Publish the following message to the source RabbitMQ via command line or GUI:

    - Exchange name: as configured `SOURCE_RABBIT_EXCHANGE_NAME` variable (e.g. projects)

    - Routing key: `project.draft-created`

    - Properties: `correlation_id` = 1000, `content_type` = application/json

    - Payload:

    ```json
    {
      "id": 521,
      "directProjectId": 10591,
      "billingAccountId": null,
      "name": "test",
      "description": "test",
      "external": null,
      "bookmarks": [],
      "estimatedPrice": null,
      "actualPrice": null,
      "terms": [],
      "type": "visual_design",
      "status": "draft",
      "details": {
        "devices": [
          "phone"
        ],
        "utm": {}
      },
      "challengeEligibility": [],
      "createdAt": "2016-11-04T03:57:57.000Z",
      "updatedAt": "2016-11-04T03:57:57.000Z",
      "createdBy": 40152856,
      "updatedBy": 40152856,
      "members": [
        {
          "id": 1185,
          "userId": 40051331,
          "role": "manager",
          "isPrimary": true,
          "createdAt": "2016-11-04T03:57:57.000Z",
          "updatedAt": "2016-11-04T03:57:57.000Z",
          "createdBy": 40152856,
          "updatedBy": 40152856,
          "projectId": 521
        },
        {
          "id": 1189,
          "userId": 50051333,
          "role": "customer",
          "isPrimary": true,
          "createdAt": "2016-11-04T17:30:42.000Z",
          "updatedAt": "2016-11-04T17:30:42.000Z",
          "createdBy": 8547899,
          "updatedBy": 8547899,
          "projectId": 521
        }
      ],
      "attachments": []
    }
    ```

- Verify that a notification message is sent to the target RabbitMQ `TARGET_RABBIT_QUEUE_NAME`

  ```json
  {
    "recipients":[
      {
        "id":50051333,
        "params":{
          "projectId":521,
          "projectName":"test",
          "projectDescription":"test"
        }
      }
    ],
    "notificationType":"Project.Created",
    "subject":"Created"
  }
  ```

### Delay verification

- Publish the following message to the source RabbitMQ via command line or GUI:

    - Exchange name: as configured `SOURCE_RABBIT_EXCHANGE_NAME` variable (e.g. projects)

    - Routing key: `project.updated`

    - Properties: `correlation_id` = 1000, `content_type` = application/json

    - Payload:

    ```json
    {
      "original": {
        "id": 1,
        "directProjectId": 10591,
        "billingAccountId": null,
        "name": "test",
        "description": "test",
        "external": null,
        "bookmarks": [],
        "estimatedPrice": null,
        "actualPrice": null,
        "terms": [],
        "type": "visual_design",
        "status": "in_review",
        "details": {
          "devices": [
            "phone"
          ],
          "utm": {}
        },
        "challengeEligibility": [],
        "createdAt": "2016-11-04T03:57:57.000Z",
        "updatedAt": "2016-11-04T03:57:57.000Z",
        "createdBy": 40152856,
        "updatedBy": 40152856,
        "members": [
          {
            "id": 1185,
            "userId": 40152856,
            "role": "manager",
            "isPrimary": true,
            "createdAt": "2016-11-04T03:57:57.000Z",
            "updatedAt": "2016-11-04T03:57:57.000Z",
            "createdBy": 40152856,
            "updatedBy": 40152856,
            "projectId": 521
          },
          {
            "id": 1189,
            "userId": 8547899,
            "role": "customer",
            "isPrimary": false,
            "createdAt": "2016-11-04T17:30:42.000Z",
            "updatedAt": "2016-11-04T17:30:42.000Z",
            "createdBy": 8547899,
            "updatedBy": 8547899,
            "projectId": 521
          }
        ],
        "attachments": []
      },
      "updated": {
        "id": 1,
        "directProjectId": 10591,
        "billingAccountId": null,
        "name": "test",
        "description": "test",
        "external": null,
        "bookmarks": [],
        "estimatedPrice": null,
        "actualPrice": null,
        "terms": [],
        "type": "visual_design",
        "status": "reviewed",
        "details": {
          "devices": [
            "phone"
          ],
          "utm": {}
        },
        "challengeEligibility": [],
        "createdAt": "2016-11-04T03:57:57.000Z",
        "updatedAt": "2016-11-05T00:00:00.000Z",
        "createdBy": 40152856,
        "updatedBy": 40152856,
        "members": [
          {
            "id": 1185,
            "userId": 40152856,
            "role": "manager",
            "isPrimary": true,
            "createdAt": "2016-11-04T03:57:57.000Z",
            "updatedAt": "2016-11-04T03:57:57.000Z",
            "createdBy": 40152856,
            "updatedBy": 40152856,
            "projectId": 1
          },
          {
            "id": 1189,
            "userId": 8547899,
            "role": "customer",
            "isPrimary": false,
            "createdAt": "2016-11-04T17:30:42.000Z",
            "updatedAt": "2016-11-04T17:30:42.000Z",
            "createdBy": 8547899,
            "updatedBy": 8547899,
            "projectId": 1
          },
          {
            "id": 1190,
            "userId": 8547900,
            "role": "customer",
            "isPrimary": true,
            "createdAt": "2016-11-04T17:30:42.000Z",
            "updatedAt": "2016-11-04T17:30:42.000Z",
            "createdBy": 8547899,
            "updatedBy": 8547899,
            "projectId": 1
          },
          {
            "id": 1190,
            "userId": 123456,
            "role": "customer",
            "isPrimary": false,
            "createdAt": "2016-11-04T17:30:42.000Z",
            "updatedAt": "2016-11-04T17:30:42.000Z",
            "createdBy": 8547899,
            "updatedBy": 8547899,
            "projectId": 1
          }
        ],
        "attachments": []
      }
    }
    ```


- Verify that a slack notification in `COPILOT_TARGET_RABBIT_QUEUE_NAME` and one another after `UNCLAIMED_PROJECT_REPOST_DELAY` notifications continues coming until copilot is assigned.

```json
{
  "username": "webhookbot",
  "icon_url": "https://emoji.slack-edge.com/T03R80JP7/topcoder/7c68acd90a6b6d77.png",
  "attachments": [
    {
      "fallback": "New Project: https://connect.topcoder.com/projects/| test",
      "pretext": "New Project: https://connect.topcoder.com/projects/| test",
      "fields": [
        {
          "title": "Description",
          "value": "test",
          "short": true
        },
        {
          "title": "Description",
          "value": "test",
          "short": false
        },
        {
          "title": "Ref Code",
          "value": 1,
          "short": false
        }
      ]
    }
  ]
}
```
