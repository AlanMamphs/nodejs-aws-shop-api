// index.js
import { Handler, APIGatewayTokenAuthorizerEvent } from "aws-lambda";


export const handler: Handler<APIGatewayTokenAuthorizerEvent> = async (
  event,
  _,
  callback
) => {
  const token = event.authorizationToken;

  if (!token) {
    callback(null, generatePolicy("user", "Deny", event.methodArn));
    return;
  }

  const [githubUser, secret] = atob(
    event.authorizationToken.replace("Basic ", "")
  ).split(":", 1);

  if (process.env[githubUser.toUpperCase()] && process.env[githubUser] == secret) {
    callback(null, generatePolicy("user", "Allow", event.methodArn));
    return;
  }

  return callback(null, generatePolicy("user", "Deny", event.methodArn));
};

const generatePolicy = function (
  principalId: string,
  effect: string,
  resource: string
) {
  return {
    principalId: principalId,
    policyDocument: {
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
      Version: "2012-10-17",
    },
  };
};
