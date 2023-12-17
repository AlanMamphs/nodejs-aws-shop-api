import * as path from "path";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";

import * as dotenv from "dotenv";
import { ServicePrincipal } from "aws-cdk-lib/aws-iam";

dotenv.config();

/**
 * Stack, which creates LambdaRestApi Gateway, with TokenAuthorizer
 *
 * @export
 * @class GatewayLambdaAuth
 * @extends {cdk.Stack}
 */
export class AuthorizationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Import Products File Stack

    const lambda = new NodejsFunction(this, "basicAuthorizer", {
      entry: path.join(__dirname, "..", "lambdas", "basicAuthorizer.ts"),
      functionName: "basicAuthorizer",
      depsLockFilePath: path.join(
        __dirname,
        "..",
        "lambdas",
        "package-lock.json"
      ),
      runtime: Runtime.NODEJS_18_X,
      environment: Object.entries(process.env)
        .filter(([key]) => key.startsWith("AUTH_SERVICE_"))
        .reduce(
          (prev, [key, value]) => ({
            ...prev,
            ...{ [key.replace("AUTH_SERVICE_", "").toUpperCase()]: value },
          }),
          {}
        ),
    });

    lambda.grantInvoke({
      grantPrincipal: new ServicePrincipal("apigateway.amazonaws.com"),
    });
  }
}
