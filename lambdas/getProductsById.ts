import { products } from "./mockData";

import { APIGatewayEvent, Handler } from "aws-lambda";

export const handler: Handler<APIGatewayEvent> = async (event) => {
  const productId = event["pathParameters"]?.["id"];
  const product = products.find((p) => p.id === productId);
  if (!product) {
    return {
      statusCode: 404,
      body: JSON.stringify({
        message: "Product not found",
      }),
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    };
  }
  return {
    statusCode: 200,
    body: JSON.stringify(product),
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  };
};
