import { APIGatewayEvent, Context, Handler } from "aws-lambda";

export const lambdaResp = ({
  body,
  statusCode,
  headers,
}: {
  body: string | object | object[];
  statusCode: number;
  headers?: Record<string, string>;
}) => ({
  statusCode,
  body: typeof body === "string" ? body : JSON.stringify(body),
  headers: {
    "Access-Control-Allow-Origin": "*",
    ...(headers ?? {}),
  },
});

export const withLogger = <T = APIGatewayEvent>(handler: Handler<T>) => {
  return async (event: T, context: Context) => {
    try {
      // Log the incoming event
      console.log("Incoming Event:", JSON.stringify(event, null, 2));

      // Call the original Lambda handler
      const result = await handler(event, context, () => ({}));

      // Log any relevant output or results
      console.log("Lambda Function Output:", result);

      // Return the result from the original Lambda handler
      return result;
    } catch (error) {
      // Log any errors
      console.error("Error:", error);

      // Rethrow the error to maintain Lambda behavior
      throw error;
    }
  };
};

