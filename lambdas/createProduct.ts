import { APIGatewayEvent, Handler } from "aws-lambda";

import { v4 as uuidv4 } from "uuid";
import { ddb } from "./dynamoDBClient";
import { lambdaResp, withLogger } from "./utils";

const PRODUCT_TABLE_NAME = process.env.PRODUCT_TABLE_NAME || "Products";
const STOCK_TABLE_NAME = process.env.STOCK_TABLE_NAME || "Stock";
const PRODUCT_PRIMARY_KEY = process.env.PRODUCT_PRIMARY_KEY || "id";
const STOCK_PRIMARY_KEY = process.env.STOCK_PRIMARY_KEY || "product_id";

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
    [PRODUCT_PRIMARY_KEY]: productId,
    title,
    description,
    price,
  };

  const stock = {
    [STOCK_PRIMARY_KEY]: productId,
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
    const result = await ddb.transactWrite(params);
    console.log("Transaction Result:", result);
    return lambdaResp({ statusCode: 201, body: {} });
  } catch (dbError) {
    console.error("Error creating product and stock:", dbError);
    return lambdaResp({ statusCode: 500, body: { message: dbError } });
  }
});
