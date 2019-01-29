#!/usr/bin/env bash

# more bash-friendly output for jq
JQ="jq --raw-output --exit-status"

ENV=$1
ACCOUNT_ID=$(eval "echo \$${ENV}_AWS_ACCOUNT_ID")

configure_aws_cli() {
	export AWS_ACCESS_KEY_ID=$(eval "echo \$${ENV}_AWS_ACCESS_KEY_ID")
	export AWS_SECRET_ACCESS_KEY=$(eval "echo \$${ENV}_AWS_SECRET_ACCESS_KEY")
	aws --version
	aws configure set default.region $AWS_REGION
	aws configure set default.output json
}

deploy_cluster() {

    family="tc-connect-notifications"

    make_task_def
    register_definition
    if [[ $(aws ecs update-service --cluster $AWS_ECS_CLUSTER --service $AWS_ECS_SERVICE --task-definition $revision | \
                   $JQ '.service.taskDefinition') != $revision ]]; then
        echo "Error updating service."
        return 1
    fi

    echo "Deployed!"
    return 0
}

make_task_def(){
	task_template='[
		{
			"name": "tc-connect-notifications",
			"image": "%s.dkr.ecr.%s.amazonaws.com/%s:%s",
			"essential": true,
			"memory": 512,
			"cpu": 256,
			"environment": [
				{
					"name": "NODE_ENV",
					"value": "%s"
				},
				{
					"name": "LOG_LEVEL",
					"value": "%s"
				},
				{
					"name": "CAPTURE_LOGS",
					"value": "%s"
				},
				{
					"name": "LOGENTRIES_TOKEN",
					"value": "%s"
				},
				{
					"name": "RABBITMQ_URL",
					"value": "%s"
				},
				{
					"name": "TC_SLACK_WEBHOOK_URL",
					"value": "%s"
				},
				{
					"name": "AUTH0_URL",
					"value": "%s"
				},
				{
					"name": "AUTH0_AUDIENCE",
					"value": "%s"
				},
				{
					"name": "AUTH0_CLIENT_ID",
					"value": "%s"
				},
				{
					"name": "AUTH0_CLIENT_SECRET",
					"value": "%s"
				},
				{
					"name": "TOKEN_CACHE_TIME",
					"value": "%s"
				},
				{
					"name": "AUTH0_PROXY_SERVER_URL",
					"value": "%s"
				},
				{
					"name": "API_URL_PROJECTS",
					"value": "%s"
				},
				{
					"name": "API_URL_MEMBERS",
					"value": "%s"
				},
				{
					"name": "API_URL_USERS",
					"value": "%s"
				},
				{
					"name": "API_URL_AUTHORIZATIONS",
					"value": "%s"
				},
				{
					"name": "API_URL_TOPICS",
					"value": "%s"
				}
			],
			"logConfiguration": {
				"logDriver": "awslogs",
				"options": {
				"awslogs-group": "/aws/ecs/%s",
				"awslogs-region": "%s",
				"awslogs-stream-prefix": "%s"
				}
			}
		}
	]'
	RABBITMQ_URL=$(eval "echo \$${ENV}_RABBITMQ_URL")
	CAPTURE_LOGS=$(eval "echo \$${ENV}_CAPTURE_LOGS")
	LOGENTRIES_TOKEN=$(eval "echo \$${ENV}_LOGENTRIES_TOKEN")
	LOG_LEVEL=$(eval "echo \$${ENV}_LOG_LEVEL")
	AUTH0_URL=$(eval "echo \$${ENV}_AUTH0_URL")
	AUTH0_AUDIENCE=$(eval "echo \$${ENV}_AUTH0_AUDIENCE")
	TOKEN_CACHE_TIME=$(eval "echo \$${ENV}_TOKEN_CACHE_TIME")
	AUTH0_CLIENT_ID=$(eval "echo \$${ENV}_AUTH0_CLIENT_ID")
	AUTH0_CLIENT_SECRET=$(eval "echo \$${ENV}_AUTH0_CLIENT_SECRET")
	AUTH0_PROXY_SERVER_URL=$(eval "echo \$${ENV}_AUTH0_PROXY_SERVER_URL")
	API_URL_PROJECTS=$(eval "echo \$${ENV}_API_URL_PROJECTS")
	API_URL_MEMBERS=$(eval "echo \$${ENV}_API_URL_MEMBERS")
	API_URL_USERS=$(eval "echo \$${ENV}_API_URL_USERS")
	API_URL_AUTHORIZATIONS=$(eval "echo \$${ENV}_API_URL_AUTHORIZATIONS")
	API_URL_TOPICS=$(eval "echo \$${ENV}_API_URL_TOPICS")

	if [ "$ENV" = "PROD" ]; then
		NODE_ENV=production
	elif [ "$ENV" = "DEV" ]; then
		NODE_ENV=development
	fi

	task_def=$(printf "$task_template" $ACCOUNT_ID $AWS_REGION $AWS_REPOSITORY $CIRCLE_SHA1 $NODE_ENV $LOG_LEVEL $CAPTURE_LOGS $LOGENTRIES_TOKEN $RABBITMQ_URL $TC_SLACK_WEBHOOK_URL "$AUTH0_URL" "$AUTH0_AUDIENCE" $AUTH0_CLIENT_ID "$AUTH0_CLIENT_SECRET" $TOKEN_CACHE_TIME "$AUTH0_PROXY_SERVER_URL" "$API_URL_PROJECTS" "$API_URL_MEMBERS" "$API_URL_USERS" "$API_URL_AUTHORIZATIONS" "$API_URL_TOPICS" $AWS_ECS_CLUSTER $AWS_REGION $NODE_ENV)
}

push_ecr_image(){
	eval $(aws ecr get-login --region $AWS_REGION --no-include-email)
	docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$AWS_REPOSITORY:$CIRCLE_SHA1
}

register_definition() {

    if revision=$(aws ecs register-task-definition --container-definitions "$task_def" --family $family 2> /dev/null  | $JQ '.taskDefinition.taskDefinitionArn'); then
        echo "Revision: $revision"
    else
        echo "Failed to register task definition"
        return 1
    fi

}

configure_aws_cli
push_ecr_image
deploy_cluster
