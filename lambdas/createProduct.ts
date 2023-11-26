import { APIGatewayEvent, Handler } from "aws-lambda";

import { v4 as uuidv4 } from "uuid";
import { ddb } from "./dynamoDBClient";
import { lambdaResp, withLogger } from "./utils";

import { PRODUCT_TABLE_NAME, STOCK_TABLE_NAME } from "./constants";

const generateProductId = () => uuidv4();

export const handler: Handler<APIGatewayEvent> = withLogger(async (event) => {
  if (!event.body) {
    return lambdaResp({
      statusCode: 400,
      body: { message: "invalid request, you are missing the parameter body" },
    });
  }
  const { title, description, price, count } =
    typeof event.body == "object" ? event.body : JSON.parse(event.body);

  const productId = generateProductId();

  const product = {
    id: productId,
    title,
    description,
    price,
  };

  const stock = {
    product_id: productId,
    count,
  };

  const params = {
    TransactItems: [
      {
        Put: {
          TableName: PRODUCT_TABLE_NAME,
          Item: product,
        },
      },
      {
        Put: {
          TableName: STOCK_TABLE_NAME,
          Item: stock,
        },
      },
    ],
  };

  try {
    const result = await ddb.transactWrite(params).promise();
    console.log("Transaction Result:", result);
    return lambdaResp({ statusCode: 201, body: {} });
  } catch (dbError) {
    console.error("Error creating product and stock:", dbError);
    return lambdaResp({ statusCode: 500, body: { message: dbError } });
  }
});
